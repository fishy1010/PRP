import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import { createSessionToken, getSessionCookieName, getSessionExpiryDate } from '@/lib/auth';

const COOKIE_CHALLENGE = 'webauthn_challenge';
const COOKIE_USERNAME = 'webauthn_username';

const getOrigin = (request: NextRequest) => {
  return request.headers.get('origin') || `http://${request.headers.get('host')}`;
};

const getRpId = (origin: string) => {
  return new URL(origin).hostname;
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const response = body.response;

    if (!response) {
      return NextResponse.json(
        { error: 'Authentication response is required' },
        { status: 400 }
      );
    }

    const challenge = request.cookies.get(COOKIE_CHALLENGE)?.value;
    const username = request.cookies.get(COOKIE_USERNAME)?.value;

    if (!challenge || !username) {
      return NextResponse.json(
        { error: 'Login session expired' },
        { status: 400 }
      );
    }

    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as { id: number } | undefined;
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const credentialId = response.id;
    const authenticator = db.prepare(
      'SELECT * FROM authenticators WHERE user_id = ? AND credential_id = ?'
    ).get(user.id, credentialId) as {
      credential_id: string;
      public_key: string;
      counter: number;
      transports: string | null;
    } | undefined;

    if (!authenticator) {
      return NextResponse.json(
        { error: 'Authenticator not found' },
        { status: 404 }
      );
    }

    const origin = getOrigin(request);
    const rpID = getRpId(origin);

    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      credential: {
        id: authenticator.credential_id,
        publicKey: new Uint8Array(Buffer.from(authenticator.public_key, 'base64url')),
        counter: authenticator.counter,
        transports: authenticator.transports ? JSON.parse(authenticator.transports) : undefined,
      },
    });

    if (!verification.verified) {
      return NextResponse.json(
        { error: 'Authentication verification failed' },
        { status: 400 }
      );
    }

    db.prepare('UPDATE authenticators SET counter = ? WHERE user_id = ? AND credential_id = ?').run(
      verification.authenticationInfo.newCounter,
      user.id,
      credentialId
    );

    const token = createSessionToken({ sub: user.id, username });
    const res = NextResponse.json({ success: true });

    res.cookies.set(getSessionCookieName(), token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      expires: getSessionExpiryDate(),
    });

    res.cookies.delete(COOKIE_CHALLENGE);
    res.cookies.delete(COOKIE_USERNAME);

    return res;
  } catch (error) {
    console.error('Error verifying login:', error);
    return NextResponse.json(
      { error: 'Failed to verify login' },
      { status: 500 }
    );
  }
}

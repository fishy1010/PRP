import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { verifyRegistrationResponse } from '@simplewebauthn/server';
import { createSessionToken, getSessionCookieName, getSessionExpiryDate } from '@/lib/auth';
import { getSingaporeNow, toSingaporeISO } from '@/lib/timezone';

const COOKIE_CHALLENGE = 'webauthn_challenge';
const COOKIE_USERNAME = 'webauthn_username';
const COOKIE_USERID = 'webauthn_userid';

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
        { error: 'Registration response is required' },
        { status: 400 }
      );
    }

    const challenge = request.cookies.get(COOKIE_CHALLENGE)?.value;
    const username = request.cookies.get(COOKIE_USERNAME)?.value;
    const userHandle = request.cookies.get(COOKIE_USERID)?.value;

    if (!challenge || !username || !userHandle) {
      return NextResponse.json(
        { error: 'Registration session expired' },
        { status: 400 }
      );
    }

    const origin = getOrigin(request);
    const rpID = getRpId(origin);

    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: false,
    });

    if (!verification.verified || !verification.registrationInfo) {
      return NextResponse.json(
        { error: 'Registration verification failed' },
        { status: 400 }
      );
    }

    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (existing) {
      return NextResponse.json(
        { error: 'Username already exists' },
        { status: 400 }
      );
    }

    const now = toSingaporeISO(getSingaporeNow());
    const insertUser = db.prepare(`
      INSERT INTO users (username, created_at, updated_at)
      VALUES (?, ?, ?)
    `);

    const userResult = insertUser.run(username, now, now);
    const userId = Number(userResult.lastInsertRowid);

    const { credential, credentialType } = verification.registrationInfo!;

    db.prepare(`
      INSERT INTO authenticators (user_id, credential_id, public_key, counter, transports, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      userId,
      credential.id,
      Buffer.from(credential.publicKey).toString('base64url'),
      credential.counter,
      response.response.transports ? JSON.stringify(response.response.transports) : null,
      now
    );

    const token = createSessionToken({ sub: userId, username });
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
    res.cookies.delete(COOKIE_USERID);

    return res;
  } catch (error) {
    console.error('Error verifying registration:', error);
    return NextResponse.json(
      { error: 'Failed to verify registration' },
      { status: 500 }
    );
  }
}

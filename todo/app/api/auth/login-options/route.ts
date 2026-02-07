import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { generateAuthenticationOptions } from '@simplewebauthn/server';

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
    const username = typeof body.username === 'string' ? body.username.trim() : '';

    if (!username) {
      return NextResponse.json(
        { error: 'Username is required' },
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

    const authenticators = db.prepare(
      'SELECT * FROM authenticators WHERE user_id = ?'
    ).all(user.id) as { credential_id: string; transports: string | null }[];

    if (authenticators.length === 0) {
      return NextResponse.json(
        { error: 'No authenticators registered' },
        { status: 400 }
      );
    }

    const origin = getOrigin(request);
    const rpID = getRpId(origin);

    const options = await generateAuthenticationOptions({
      rpID,
      allowCredentials: authenticators.map((auth) => ({
        id: auth.credential_id,
        transports: auth.transports ? JSON.parse(auth.transports) : undefined,
      })),
      userVerification: 'preferred',
    });

    const response = NextResponse.json(options);
    response.cookies.set(COOKIE_CHALLENGE, options.challenge, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 5,
    });
    response.cookies.set(COOKIE_USERNAME, username, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 5,
    });

    return response;
  } catch (error) {
    console.error('Error generating login options:', error);
    return NextResponse.json(
      { error: 'Failed to generate login options' },
      { status: 500 }
    );
  }
}

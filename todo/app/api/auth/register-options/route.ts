import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import db from '@/lib/db';
import { generateRegistrationOptions } from '@simplewebauthn/server';

const RP_NAME = 'Todo App';
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
    const username = typeof body.username === 'string' ? body.username.trim() : '';

    if (!username) {
      return NextResponse.json(
        { error: 'Username is required' },
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

    const origin = getOrigin(request);
    const rpID = getRpId(origin);
    const userID = crypto.randomBytes(32);

    const options = generateRegistrationOptions({
      rpName: RP_NAME,
      rpID,
      userID,
      userName: username,
      timeout: 60000,
      attestationType: 'none',
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
      },
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
    response.cookies.set(COOKIE_USERID, userID.toString('base64url'), {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 5,
    });

    return response;
  } catch (error) {
    console.error('Error generating registration options:', error);
    return NextResponse.json(
      { error: 'Failed to generate registration options' },
      { status: 500 }
    );
  }
}

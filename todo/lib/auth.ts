import crypto from 'crypto';
import { NextRequest } from 'next/server';

const SESSION_COOKIE = 'session';
const SESSION_DAYS = 7;

const base64UrlEncode = (value: Buffer | string) => {
  const buffer = typeof value === 'string' ? Buffer.from(value) : value;
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
};

const base64UrlDecode = (value: string) => {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const pad = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
  return Buffer.from(normalized + pad, 'base64');
};

const getSecret = () => {
  return process.env.AUTH_SECRET || 'dev-secret-change-me';
};

export interface SessionPayload {
  sub: number;
  username: string;
  exp: number;
}

export const createSessionToken = (payload: Omit<SessionPayload, 'exp'>) => {
  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const exp = Math.floor(Date.now() / 1000) + SESSION_DAYS * 24 * 60 * 60;
  const body = base64UrlEncode(JSON.stringify({ ...payload, exp }));
  const data = `${header}.${body}`;
  const signature = base64UrlEncode(
    crypto.createHmac('sha256', getSecret()).update(data).digest()
  );
  return `${data}.${signature}`;
};

export const verifySessionToken = (token: string): SessionPayload | null => {
  try {
    const [header, body, signature] = token.split('.');
    if (!header || !body || !signature) return null;

    const data = `${header}.${body}`;
    const expected = base64UrlEncode(
      crypto.createHmac('sha256', getSecret()).update(data).digest()
    );

    if (expected !== signature) return null;

    const payload = JSON.parse(base64UrlDecode(body).toString()) as SessionPayload;
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
};

export const getSessionFromRequest = (request: NextRequest): SessionPayload | null => {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
};

export const getSessionCookieName = () => SESSION_COOKIE;

export const getSessionExpiryDate = () => {
  const expires = new Date();
  expires.setDate(expires.getDate() + SESSION_DAYS);
  return expires;
};

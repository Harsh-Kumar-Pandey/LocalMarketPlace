import { pool } from '@/lib/db';
import { getUser, fail } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function GET() {
  const { rows: users } = await pool.query('SELECT id, name, role FROM users ORDER BY id');
  return Response.json({ user: await getUser(), users });
}

export async function POST(req) {            // dummy login
  let body;
  try {
    body = await req.json();
  } catch {
    return fail('Invalid sign-in data');
  }
  const { user_id, password } = body ?? {};
  if (typeof password !== 'string' || !password.length) return fail('Enter any password to sign in');
  const parsedUserId = Number(user_id);
  if (!Number.isSafeInteger(parsedUserId) || parsedUserId < 1) return fail('Choose a valid account');
  const { rows } = await pool.query('SELECT id, name, role FROM users WHERE id = $1', [parsedUserId]);
  if (!rows[0]) return fail('No such user', 404);
  const user = rows[0];
  const res = NextResponse.json({ user });
  res.cookies.set('uid', String(user.id), { path: '/', httpOnly: true, sameSite: 'lax' });
  return res;
}

export async function DELETE() {            // logout
  const res = NextResponse.json({ ok: true });
  res.cookies.set('uid', '', { path: '/', maxAge: 0 });
  return res;
}

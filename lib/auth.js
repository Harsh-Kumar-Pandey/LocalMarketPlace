// Dummy auth: the "uid" cookie just holds a user id. No passwords.
import { cookies } from 'next/headers';
import { pool } from './db';

export async function getUser() {
  const uid = (await cookies()).get('uid')?.value;
  if (!uid) return null;
  const { rows } = await pool.query(
    `SELECT u.id, u.name, u.role, s.id AS shop_id
       FROM users u LEFT JOIN shops s ON s.owner_id = u.id WHERE u.id = $1`, [uid]);
  return rows[0] ?? null;
}

export const fail = (error, status = 400) => Response.json({ error }, { status });

// RBAC guard: returns { user } or { err } (a ready-to-return Response)
export async function requireRole(...roles) {
  const user = await getUser();
  if (!user) return { err: fail('Log in first', 401) };
  if (!roles.includes(user.role)) return { err: fail(`Role "${user.role}" is not allowed`, 403) };
  return { user };
}

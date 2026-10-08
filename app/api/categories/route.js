import { pool } from '@/lib/db';
export async function GET() {
  const { rows } = await pool.query('SELECT id, name FROM categories ORDER BY name');
  return Response.json(rows);
}

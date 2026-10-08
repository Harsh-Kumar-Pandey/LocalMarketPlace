import { pool } from '@/lib/db';
import { requireRole, fail } from '@/lib/auth';

const BASE = `SELECT p.*, c.name AS category, s.name AS shop, s.locality
                FROM products p
                JOIN shops s ON s.id = p.shop_id
                LEFT JOIN categories c ON c.id = p.category_id
               WHERE p.is_active`;

// GET /api/products          -> everyone (buyers browse)
// GET /api/products?mine=1   -> seller's own items
export async function GET(req) {
  if (new URL(req.url).searchParams.get('mine')) {
    const { user, err } = await requireRole('seller');
    if (err) return err;
    const { rows } = await pool.query(`${BASE} AND p.shop_id = $1 ORDER BY p.id DESC`, [user.shop_id]);
    return Response.json(rows);
  }
  const { rows } = await pool.query(`${BASE} ORDER BY p.id DESC`);
  return Response.json(rows);
}

// POST -> seller adds an item to their shop
export async function POST(req) {
  const { user, err } = await requireRole('seller');
  if (err) return err;
  if (!user.shop_id) return fail('This seller does not have a shop configured', 409);
  let body;
  try {
    body = await req.json();
  } catch {
    return fail('Invalid product data');
  }
  const { name, description, price, stock, category_id } = body ?? {};
  const parsedPrice = Number(price);
  const parsedStock = Number(stock);
  const parsedCategoryId = category_id === '' || category_id == null ? null : Number(category_id);
  if (typeof name !== 'string' || !name.trim()) return fail('Enter a product name');
  if (typeof price !== 'string' && typeof price !== 'number' || !Number.isFinite(parsedPrice) ||
      parsedPrice < 0 || parsedPrice > 99999999.99) return fail('Enter a valid price from 0 to 99,999,999.99');
  if ((typeof stock !== 'string' && typeof stock !== 'number') || String(stock).trim() === '' ||
      !Number.isSafeInteger(parsedStock) || parsedStock < 0 || parsedStock > 2147483647) {
    return fail('Enter a valid whole-number stock from 0 to 2,147,483,647');
  }
  if (description != null && typeof description !== 'string') return fail('Description must be text');
  if (parsedCategoryId !== null && (!Number.isSafeInteger(parsedCategoryId) || parsedCategoryId < 1)) {
    return fail('Choose a valid category');
  }
  if (parsedCategoryId !== null) {
    const category = await pool.query('SELECT id FROM categories WHERE id = $1', [parsedCategoryId]);
    if (!category.rows[0]) return fail('Choose a valid category');
  }
  const { rows } = await pool.query(
    `INSERT INTO products (shop_id, category_id, name, description, price, stock)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [user.shop_id, parsedCategoryId, name.trim(), description?.trim() || null, parsedPrice, parsedStock]);
  return Response.json(rows[0], { status: 201 });
}

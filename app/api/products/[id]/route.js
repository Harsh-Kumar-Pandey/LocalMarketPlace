import { pool } from '@/lib/db';
import { requireRole, fail } from '@/lib/auth';

// Seller can touch only their own shop's products. Admin can touch any.
async function guard(params) {
  const { id } = await params;
  const { user, err } = await requireRole('seller', 'admin');
  if (err) return { err };
  const { rows } = await pool.query('SELECT shop_id FROM products WHERE id = $1 AND is_active', [id]);
  if (!rows[0]) return { err: fail('Product not found', 404) };
  if (user.role === 'seller' && rows[0].shop_id !== user.shop_id) return { err: fail('Not your product', 403) };
  return { id, user };
}

export async function PUT(req, { params }) {
  const { id, user, err } = await guard(params);
  if (err) return err;
  let body;
  try {
    body = await req.json();
  } catch {
    return fail('Invalid product data');
  }
  const { name, description, price, stock, category_id } = body ?? {};
  if (name !== undefined && (typeof name !== 'string' || !name.trim())) return fail('Product name cannot be empty');
  if (description !== undefined && description !== null && typeof description !== 'string') {
    return fail('Description must be text');
  }
  if (price !== undefined && (typeof price !== 'string' && typeof price !== 'number' ||
      !Number.isFinite(Number(price)) || Number(price) < 0 || Number(price) > 99999999.99)) {
    return fail('Enter a valid price from 0 to 99,999,999.99');
  }
  if (stock !== undefined && ((typeof stock !== 'string' && typeof stock !== 'number') ||
      String(stock).trim() === '' || !Number.isSafeInteger(Number(stock)) || Number(stock) < 0 ||
      Number(stock) > 2147483647)) return fail('Enter a valid whole-number stock from 0 to 2,147,483,647');
  if (category_id !== undefined && category_id !== null &&
      (!Number.isSafeInteger(Number(category_id)) || Number(category_id) < 1)) {
    return fail('Choose a valid category');
  }
  if (category_id !== undefined && category_id !== null) {
    const category = await pool.query('SELECT id FROM categories WHERE id = $1', [Number(category_id)]);
    if (!category.rows[0]) return fail('Choose a valid category');
  }
  const { rows } = await pool.query(
    `UPDATE products SET name = COALESCE($1, name), description = COALESCE($2, description),
            price = COALESCE($3, price), stock = COALESCE($4, stock), category_id = COALESCE($5, category_id)
      WHERE id = $6 AND ($7::boolean OR shop_id = $8) RETURNING *`,
    [name?.trim() || null, description === undefined ? null : description?.trim() ?? null,
      price ?? null, stock ?? null, category_id ?? null,
      id, user.role === 'admin', user.shop_id ?? null]);
  if (!rows[0]) return fail('Product not found or unavailable', 404);
  return Response.json(rows[0]);
}

// Soft delete so past orders keep pointing at a real row.
export async function DELETE(_req, { params }) {
  const { id, err } = await guard(params);
  if (err) return err;
  await pool.query('UPDATE products SET is_active = false WHERE id = $1', [id]);
  return Response.json({ ok: true });
}

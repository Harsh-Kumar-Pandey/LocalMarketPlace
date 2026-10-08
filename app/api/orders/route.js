import { pool } from '@/lib/db';
import { getUser, requireRole, fail } from '@/lib/auth';

class OrderInputError extends Error {}

// Buyers see their orders; sellers see orders containing products from their shop.
export async function GET() {
  const user = await getUser();
  if (!user) return fail('Log in first', 401);

  if (user.role === 'buyer') {
    const { rows } = await pool.query(
      `SELECT o.id, o.status, o.total, o.created_at,
              json_agg(json_build_object('name', p.name, 'quantity', oi.quantity, 'unit_price', oi.unit_price)) AS items
         FROM orders o
         JOIN order_items oi ON oi.order_id = o.id
         JOIN products p ON p.id = oi.product_id
        WHERE o.buyer_id = $1
        GROUP BY o.id ORDER BY o.created_at DESC`, [user.id]);
    return Response.json(rows);
  }

  if (user.role === 'seller' && user.shop_id) {
    const { rows } = await pool.query(
      `SELECT o.id, o.status, o.total, o.created_at, b.name AS buyer,
              json_agg(json_build_object('name', p.name, 'quantity', oi.quantity, 'unit_price', oi.unit_price)) AS items
         FROM orders o
         JOIN users b ON b.id = o.buyer_id
         JOIN order_items oi ON oi.order_id = o.id
         JOIN products p ON p.id = oi.product_id
         JOIN shops s ON s.id = p.shop_id
        WHERE s.owner_id = $1
        GROUP BY o.id, b.name ORDER BY o.created_at DESC`, [user.id]);
    return Response.json(rows);
  }

  return fail('This account cannot view marketplace orders', 403);
}

// POST { items: [{ product_id, quantity }] } -> places an order in one transaction
export async function POST(req) {
  const { user, err } = await requireRole('buyer');
  if (err) return err;
  let body;
  try {
    body = await req.json();
  } catch {
    return fail('Invalid order data');
  }
  if (!Array.isArray(body?.items) || !body.items.length) return fail('No items');

  const quantities = new Map();
  for (const item of body.items) {
    const productId = Number(item?.product_id);
    const quantity = Number(item?.quantity);
    if (!Number.isSafeInteger(productId) || productId < 1 || productId > 2147483647) {
      return fail('Choose a valid product');
    }
    if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 2147483647) {
      return fail('Quantity must be a positive whole number');
    }
    const combinedQuantity = (quantities.get(productId) ?? 0) + quantity;
    if (!Number.isSafeInteger(combinedQuantity) || combinedQuantity > 2147483647) {
      return fail('Requested quantity is too large');
    }
    quantities.set(productId, combinedQuantity);
  }

  const db = await pool.connect();
  try {
    await db.query('BEGIN');
    let totalCents = 0;
    const lines = [];
    for (const [productId, quantity] of quantities) {
      const { rows } = await db.query(
        'SELECT id, name, price, stock FROM products WHERE id = $1 AND is_active FOR UPDATE', [productId]);
      const p = rows[0];
      if (!p) throw new OrderInputError('Product not available');
      if (p.stock < quantity) throw new OrderInputError(`Only ${p.stock} of "${p.name}" left`);
      await db.query('UPDATE products SET stock = stock - $1 WHERE id = $2', [quantity, p.id]);
      const priceCents = Math.round(Number(p.price) * 100);
      if (priceCents > Math.floor((999999999999 - totalCents) / quantity)) {
        throw new OrderInputError('Order total is too large');
      }
      totalCents += priceCents * quantity;
      lines.push({ id: p.id, quantity, price: p.price });
    }
    const { rows: [order] } = await db.query(
      'INSERT INTO orders (buyer_id, total) VALUES ($1, $2) RETURNING *',
      [user.id, (totalCents / 100).toFixed(2)]);
    for (const line of lines) {
      await db.query(
        'INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES ($1,$2,$3,$4)',
        [order.id, line.id, line.quantity, line.price]);
    }
    await db.query('COMMIT');
    return Response.json(order, { status: 201 });
  } catch (e) {
    try {
      await db.query('ROLLBACK');
    } catch (rollbackError) {
      console.error('Could not roll back failed order transaction:', rollbackError);
    }
    if (e instanceof OrderInputError) return fail(e.message);
    console.error('Could not place order:', e);
    return fail('Could not place the order. Please try again.', 500);
  } finally {
    db.release();
  }
}

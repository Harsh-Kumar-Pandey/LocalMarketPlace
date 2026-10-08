'use client';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { productImage } from '@/lib/product-image';

const empty = { name: '', description: '', price: '', stock: '', category_id: '' };

export default function Seller() {
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [orders, setOrders] = useState([]);
  const [cats, setCats] = useState([]);
  const [form, setForm] = useState(empty);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const session = await api('/api/session');
      if (!session?.user || session.user.role !== 'seller') {
        router.replace('/');
        return;
      }
      const [productData, categoryData, orderData] = await Promise.all([
        api('/api/products?mine=1'),
        api('/api/categories'),
        api('/api/orders'),
      ]);
      if (!Array.isArray(productData)) throw new Error(productData?.error || 'Could not load your products');
      if (!Array.isArray(categoryData)) throw new Error(categoryData?.error || 'Could not load categories');
      if (!Array.isArray(orderData)) throw new Error(orderData?.error || 'Could not load your orders');
      setItems(productData);
      setCats(categoryData);
      setOrders(orderData);
      setError('');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    load();
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') load();
    }, 10000);
    return () => clearInterval(interval);
  }, [load]);

  async function add(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const result = await api('/api/products', { method: 'POST', body: form });
      if (!result?.id) throw new Error(result?.error || 'The product could not be added');
      setForm(empty);
      setMessage(`${result.name} was added to your shop.`);
      await load();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  async function save(product, price, stock) {
    setError('');
    setMessage('');
    try {
      const result = await api(`/api/products/${product.id}`, {
        method: 'PUT',
        body: { price, stock },
      });
      if (!result?.id) throw new Error(result?.error || 'The product could not be updated');
      setMessage(`${product.name} was updated.`);
      await load();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function remove(product) {
    setError('');
    setMessage('');
    try {
      const result = await api(`/api/products/${product.id}`, { method: 'DELETE' });
      if (result?.error) throw new Error(result.error);
      setMessage(`${product.name} was removed from your shop.`);
      await load();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  return (
    <>
      <section className="seller-banner">
        <div className="page-intro">
          <span className="eyebrow">Your neighbourhood storefront</span>
          <h1>Your shop</h1>
          <p className="muted">A little home for everything you make and sell.</p>
        </div>
        <div className="row">
          <div className="seller-summary">
            <div className="summary-chip"><strong>{items.length}</strong><span>products</span></div>
            <div className="summary-chip"><strong>{orders.length}</strong><span>orders</span></div>
          </div>
          <button className="ghost" onClick={load} disabled={loading}>↻ &nbsp;Refresh</button>
        </div>
      </section>
      {error && <p className="err" role="alert">{error}</p>}
      {message && <p className="notice" role="status">{message}</p>}

      <section>
        <div className="section-heading">
          <div><span className="eyebrow">Fresh from your workbench</span><h2>Add a product</h2></div>
          <p className="muted">Share something special with your neighbourhood.</p>
        </div>
        <form className="card seller-form" onSubmit={add}>
          <label className="field field-wide">Product name
            <input
              placeholder="e.g. Homemade mango pickle"
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              required
            />
          </label>
          <label className="field field-wide">Description
            <input
              placeholder="A short description"
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
            />
          </label>
          <label className="field">Price (₹)
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={form.price}
              onChange={(event) => setForm({ ...form, price: event.target.value })}
              required
            />
          </label>
          <label className="field">Quantity in stock
            <input
              type="number"
              min="0"
              step="1"
              placeholder="0"
              value={form.stock}
              onChange={(event) => setForm({ ...form, stock: event.target.value })}
              required
            />
          </label>
          <label className="field">Category
            <select
              value={form.category_id}
              onChange={(event) => setForm({ ...form, category_id: event.target.value })}
            >
              <option value="">Choose category</option>
              {cats.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
          </label>
          <button type="submit" disabled={saving}>{saving ? 'Adding…' : '＋ Add product'}</button>
        </form>
      </section>

      <div className="section-heading">
        <div><span className="eyebrow">On the shelves</span><h2>Listed products</h2></div>
        <p className="muted">Update prices and stock whenever you need.</p>
      </div>
      {loading && <p className="muted">Loading your products…</p>}
      {!loading && !items.length && <p className="muted">Nothing listed yet. Add your first product above.</p>}
      <div className="grid">
        {items.map((product) => (
          <Row key={product.id} product={product} save={save} remove={remove} />
        ))}
      </div>

      <div className="section-heading">
        <div><span className="eyebrow">From your customers</span><h2>Orders for your shop</h2></div>
        <p className="muted">Incoming orders refresh automatically.</p>
      </div>
      {loading && !orders.length && <p className="muted">Loading orders…</p>}
      {!loading && !orders.length && <p className="muted">No orders for your products yet.</p>}
      <div className="orders-list">
        {orders.map((order) => (
          <div className="card order-card" key={order.id}>
            <div>
              <b>Order #{order.id}</b>
              <p className="muted">Buyer: {order.buyer} · {order.items.map((item) => `${item.name} × ${item.quantity}`).join(', ')}</p>
              <span className="muted">{new Date(order.created_at).toISOString().replace('T', ' ').slice(0, 16)} UTC</span>
            </div>
            <div className="order-total">
              <span className="status-pill">{order.status}</span>
              <div><b>₹{Number(order.total).toFixed(2)}</b></div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function Row({ product, save, remove }) {
  const [price, setPrice] = useState(product.price);
  const [stock, setStock] = useState(product.stock);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setPrice(product.price);
    setStock(product.stock);
  }, [product.price, product.stock]);

  async function update() {
    setBusy(true);
    try {
      await save(product, price, stock);
    } finally {
      setBusy(false);
    }
  }

  async function deleteProduct() {
    setBusy(true);
    try {
      await remove(product);
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="card seller-product-card">
      <div className="product-image">
        <img src={productImage(product.category, product.name)} alt={`${product.category || 'Local'} product: ${product.name}`} />
        <span className="category-pill">{product.category || 'Local find'}</span>
      </div>
      <div className="seller-product-content">
        <h3>{product.name}</h3>
        <p className="muted">{product.description || 'A special find from your shop.'}</p>
        <div className="seller-product-fields">
          <label className="field">Price (₹)
            <input type="number" min="0" step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} />
          </label>
          <label className="field">In stock
            <input type="number" min="0" step="1" value={stock} onChange={(event) => setStock(event.target.value)} />
          </label>
        </div>
        <div className="seller-actions">
        <button onClick={update} disabled={busy}>Save</button>
        <button className="remove" onClick={deleteProduct} disabled={busy}>Remove</button>
        </div>
      </div>
    </article>
  );
}

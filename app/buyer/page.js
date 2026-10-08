'use client';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { productImage } from '@/lib/product-image';

export default function Buyer() {
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [qty, setQty] = useState({});
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(null);

  const load = useCallback(async () => {
    try {
      const session = await api('/api/session');
      if (!session?.user || session.user.role !== 'buyer') {
        router.replace('/');
        return;
      }
      const [productData, orderData] = await Promise.all([
        api('/api/products'),
        api('/api/orders'),
      ]);
      if (!Array.isArray(productData)) throw new Error(productData?.error || 'Could not load products');
      if (!Array.isArray(orderData)) throw new Error(orderData?.error || 'Could not load your orders');
      setProducts(productData);
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

  async function buy(product) {
    setBuying(product.id);
    setError('');
    setMessage('');
    try {
      const result = await api('/api/orders', {
        method: 'POST',
        body: {
          items: [{
            product_id: product.id,
            quantity: Number(qty[product.id] || 1),
          }],
        },
      });
      if (!result?.id) throw new Error(result?.error || 'The order could not be placed');
      setMessage(`Order #${result.id} placed successfully.`);
      await load();
    } catch (requestError) {
      await load();
      setError(requestError.message);
    } finally {
      setBuying(null);
    }
  }

  return (
    <>
      <section className="buyer-banner">
        <div className="page-intro">
          <span className="eyebrow">The neighbourhood edit</span>
          <h1>Shop local</h1>
          <p className="muted">Good things made nearby, picked just for you.</p>
        </div>
        <div className="row">
          <span className="local-pill"><span aria-hidden="true">✳</span> Your community, in one place</span>
          <button className="ghost" onClick={load} disabled={loading}>↻ &nbsp;Refresh</button>
        </div>
      </section>
      {error && <p className="err" role="alert">{error}</p>}
      {message && <p className="notice" role="status">{message}</p>}

      {loading ? <p className="muted">Loading the shop…</p> : (
        <div className="grid">
          {products.map((product) => (
            <article className="card product-card" key={product.id}>
              <div className="product-image">
                <img src={productImage(product.category, product.name)} alt={`${product.category || 'Local'} product: ${product.name}`} />
                <span className="category-pill">{product.category || 'Local find'}</span>
              </div>
              <div className="product-content">
                <div className="product-title">
                  <h3>{product.name}</h3>
                  <span className={`stock-pill${product.stock <= 5 ? ' low' : ''}`}>
                    {product.stock < 1 ? 'Sold out' : `${product.stock} left`}
                  </span>
                </div>
                <div className="muted shop-meta">{product.shop} · {product.locality}</div>
                <p className="product-description">{product.description || 'Lovingly made by a local seller.'}</p>
                <div className="product-buy">
                  <b className="product-price">₹{Number(product.price).toFixed(2)}</b>
                  <div className="row">
                    <input
                      type="number"
                      min="1"
                      max={product.stock}
                      value={qty[product.id] ?? '1'}
                      onChange={(event) => setQty({ ...qty, [product.id]: event.target.value })}
                      aria-label={`Quantity for ${product.name}`}
                    />
                    <button
                      disabled={product.stock < 1 || buying === product.id}
                      onClick={() => buy(product)}
                    >
                      {buying === product.id ? 'Placing…' : product.stock < 1 ? 'Sold out' : 'Order'}
                    </button>
                  </div>
                </div>
              </div>
            </article>
          ))}
          {!products.length && <p className="muted">No products are available yet.</p>}
        </div>
      )}

      <div className="section-heading">
        <div><span className="eyebrow">A little history</span><h2>Your orders</h2></div>
        <p className="muted">Your recent local-market purchases</p>
      </div>
      {loading && !orders.length && <p className="muted">Loading orders…</p>}
      {!loading && orders.length === 0 && <p className="muted">No orders yet.</p>}
      <div className="orders-list">
        {orders.map((order) => (
          <div className="card order-card" key={order.id}>
            <div>
              <b>Order #{order.id}</b>
              <p className="muted">{order.items.map((item) => `${item.name} × ${item.quantity}`).join(', ')}</p>
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

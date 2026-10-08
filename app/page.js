'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

export default function Home() {
  const router = useRouter();
  const [s, setS] = useState({ user: null, users: [] });
  const [pick, setPick] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  async function load() {
    try {
      const d = await api('/api/session');
      setS(d);
      setPick(String(d.user?.id ?? d.users[0]?.id ?? ''));
      setMessage('');
    } catch (error) {
      setMessage(error.message);
    }
  }

  useEffect(() => { load(); }, []);

  async function signIn(e) {
    e.preventDefault();
    try {
      const result = await api('/api/session', {
        method: 'POST',
        body: { user_id: Number(pick), password },
      });
      if (result?.error) {
        setMessage(result.error);
        return;
      }
      const selectedUser = s.users.find((user) => String(user.id) === pick);
      setPassword('');
      if (selectedUser?.role === 'buyer') router.push('/buyer');
      if (selectedUser?.role === 'seller') router.push('/seller');
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function signOut() {
    try {
      await api('/api/session', { method: 'DELETE' });
      await load();
    } catch (error) {
      setMessage(error.message);
    }
  }

  return (
    <>
      <section className="home-hero">
        <div className="home-copy">
          <span className="eyebrow">Good things, close to home</span>
          <h1>Buy local.<br /><span>Feel good about it.</span></h1>
          <p>Discover thoughtful finds and homemade favourites from the people and shops in your neighbourhood.</p>
          <a className="button-link" href="/buyer">Explore the market <span aria-hidden="true">→</span></a>
        </div>
        <div className="hero-photo" role="img" aria-label="Fresh produce at a local market" />
        <div className="hero-stat">
          <span className="hero-stat-icon" aria-hidden="true">🌿</span>
          <span><b>Made around the corner</b><span className="muted">Small shops. Big heart.</span></span>
        </div>
      </section>

      <div className="home-lower">
        <section className="login-panel">
          <span className="eyebrow">Your local account</span>
          <h2>{s.user ? `Welcome, ${s.user.name}` : 'Step right in'}</h2>
          <p className="muted">{s.user ? `You're signed in as a ${s.user.role}.` : 'Choose a demo profile to explore the marketplace.'}</p>
          {!s.user && (
            <form className="login-form" onSubmit={signIn}>
              <select value={pick} onChange={(e) => setPick(e.target.value)} required aria-label="Choose a demo profile">
                {s.users.map((u) => <option key={u.id} value={u.id}>{u.name} · {u.role}</option>)}
              </select>
              <input
                type="password"
                placeholder="Any password (demo)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                aria-label="Demo password"
              />
              <button type="submit" disabled={!pick}>Sign in <span aria-hidden="true">→</span></button>
            </form>
          )}
          {s.user && (
            <div className="signed-in">
              <p><b>{s.user.name}</b><br /><span className="muted">Ready to explore Local Market</span></p>
              <button className="ghost" onClick={signOut}>Sign out</button>
            </div>
          )}
          {!s.user && <span className="role-note">Demo only · no account needed</span>}
          {message && <p className="err" role="alert">{message}</p>}
        </section>

        <section>
          <span className="eyebrow">Made for your neighbourhood</span>
          <h2>Where would you like to go?</h2>
          <div className="destination-grid">
            <a className="card card-link destination-card" href="/buyer">
              <span className="destination-icon" aria-hidden="true">🧺</span>
              <strong>Shop the market <span aria-hidden="true">↗</span></strong>
              <span className="muted">Browse local finds and place an order.</span>
            </a>
            <a className="card card-link destination-card" href="/seller">
              <span className="destination-icon" aria-hidden="true">🏡</span>
              <strong>Visit your shop <span aria-hidden="true">↗</span></strong>
              <span className="muted">Manage your products and incoming orders.</span>
            </a>
          </div>
        </section>
      </div>
    </>
  );
}

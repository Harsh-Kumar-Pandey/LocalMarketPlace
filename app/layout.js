import './globals.css';
export const metadata = { title: 'Local Market', description: 'Buy from sellers in your neighbourhood' };
export default function Layout({ children }) {
  return (
    <html lang="en"><body>
      <nav>
        <b><span className="brand-mark" aria-hidden="true">⌂</span> Local Market</b>
        <a href="/">Home</a><a href="/buyer">Shop</a><a href="/seller">Sell</a>
      </nav>
      <main>{children}</main>
    </body></html>
  );
}

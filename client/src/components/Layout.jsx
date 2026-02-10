import Navbar from './Navbar';

export default function Layout({ children, showNav = true }) {
  return (
    <div className="min-h-screen bg-navy-900">
      {showNav && <Navbar />}
      <main>{children}</main>
    </div>
  );
}

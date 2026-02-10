import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Navbar() {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="bg-navy-800 border-b border-navy-700 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3">
            <span className="text-2xl">🌳</span>
            <span className="text-xl font-bold text-gold-gradient">شَجَرَة</span>
          </Link>

          {/* Navigation */}
          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <>
                <Link
                  to="/dashboard"
                  className="text-gray-300 hover:text-white transition-colors text-sm"
                >
                  شجراتي
                </Link>
                <span className="text-gray-500 text-sm">{user?.name}</span>
                <button
                  onClick={handleLogout}
                  className="text-gray-400 hover:text-red-400 transition-colors text-sm cursor-pointer"
                >
                  خروج
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-gray-300 hover:text-white transition-colors text-sm"
                >
                  دخول
                </Link>
                <Link
                  to="/register"
                  className="bg-gold-500 text-navy-900 px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-gold-400 transition-colors"
                >
                  تسجيل
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

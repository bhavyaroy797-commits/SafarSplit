import { useState, useEffect } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutGrid,
  Map as MapIcon,
  Receipt,
  Settings,
  Users,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import useAuth from '../../hooks/useAuth';

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutGrid },
  { to: '/trips', label: 'My Trips', icon: MapIcon },
  { to: '/expenses', label: 'Expenses', icon: Receipt },
  { to: '/manage', label: 'Manage Trips', icon: Settings },
  { to: '/community', label: 'Community', icon: Users },
];

export default function AppHeader({ right = null }) {
  const { isAuthed, user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  const homeHref = isAuthed ? '/dashboard' : '/';

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/70">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link to={homeHref} className="flex shrink-0 items-center gap-2">
          <img src="/logo.png" alt="SafarSplit" className="h-8 w-8 object-contain" />
          <span className="text-[15px] font-extrabold tracking-tight text-ink">
            SafarSplit
          </span>
        </Link>

        {/* Desktop nav */}
        {isAuthed && (
          <nav className="hidden md:flex flex-1 items-center justify-center gap-1">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `inline-flex items-center gap-1.5 rounded-pill px-3 py-1.5 text-xs font-medium transition ${
                    isActive
                      ? 'bg-brand-50 text-brand-600'
                      : 'text-muted hover:bg-canvas hover:text-ink'
                  }`
                }
              >
                <item.icon className="h-3.5 w-3.5" />
                {item.label}
              </NavLink>
            ))}
          </nav>
        )}

        {/* Right side */}
        <div className="flex items-center gap-2">
          {right}

          {isAuthed ? (
            <>
              <span className="hidden sm:inline-flex h-9 items-center rounded-pill bg-brand-50 px-3 text-xs font-semibold text-brand-700">
                {user?.name?.split(' ')[0] || 'You'}
              </span>
              <button
                onClick={() => {
                  signOut();
                  navigate('/');
                }}
                className="inline-flex h-9 w-9 items-center justify-center rounded-pill border border-line bg-white text-muted hover:border-red-200 hover:text-red-500"
                aria-label="Sign out"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setDrawerOpen((v) => !v)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-pill border border-line bg-white text-ink md:hidden"
                aria-label="Menu"
              >
                {drawerOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="inline-flex h-9 items-center rounded-pill border border-line bg-white px-4 text-xs font-medium text-ink hover:border-brand-300 hover:text-brand-600"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="inline-flex h-9 items-center rounded-pill bg-brand-500 px-4 text-xs font-semibold text-white shadow-glow hover:bg-brand-600"
              >
                Get started
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Mobile drawer */}
      {isAuthed && drawerOpen && (
        <div className="border-t border-line bg-white md:hidden">
          <nav className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-3">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-2 rounded-inner px-3 py-2.5 text-sm font-medium transition ${
                    isActive ? 'bg-brand-50 text-brand-600' : 'text-ink hover:bg-canvas'
                  }`
                }
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
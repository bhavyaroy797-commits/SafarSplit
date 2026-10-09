import { Navigate, useLocation } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';

export default function ProtectedRoute({ children }) {
  const { isAuthed, bootstrapped } = useAuth();
  const location = useLocation();

  // Wait for /me bootstrap to finish before redirecting — prevents
  // a flash-of-login for users who DO have a valid token.
  if (!bootstrapped) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted">
        Loading…
      </div>
    );
  }

  if (!isAuthed) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return children;
}
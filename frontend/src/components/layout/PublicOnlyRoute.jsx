import { Navigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';

/**
 * Redirects logged-in users away from /login and /register to /dashboard.
 */
export default function PublicOnlyRoute({ children }) {
  const { isAuthed, bootstrapped } = useAuth();

  if (bootstrapped && isAuthed) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}
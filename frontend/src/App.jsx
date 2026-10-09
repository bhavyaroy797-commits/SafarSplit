import { useEffect } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import { useDispatch } from 'react-redux';

import Home from './pages/Home';
import MyTrips from './pages/MyTrips';
import TripWorkspace from './pages/TripWorkspace';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Expenses from './pages/Expenses';
import ManageTrips from './pages/ManageTrips';
import Community from './pages/Community';
import NotFound from './pages/NotFound';

import ProtectedRoute from './components/layout/ProtectedRoute';
import PublicOnlyRoute from './components/layout/PublicOnlyRoute';
import ToastStack from './components/common/Toast';

import { fetchMe, logout } from './features/auth/authSlice';
import { LS } from './utils/constants';

function useAuthBootstrap() {
  const dispatch = useDispatch();
  useEffect(() => {
    const token = localStorage.getItem(LS.TOKEN);
    if (token) dispatch(fetchMe()).catch(() => {});
  }, [dispatch]);
}

function useGlobalUnauthorized() {
  const dispatch = useDispatch();
  useEffect(() => {
    const handler = () => dispatch(logout());
    window.addEventListener('safarsplit:unauthorized', handler);
    return () => window.removeEventListener('safarsplit:unauthorized', handler);
  }, [dispatch]);
}

export default function App() {
  useAuthBootstrap();
  useGlobalUnauthorized();

  return (
    <Router>
      <ToastStack />
      <main className="animate-fade-rise">
        <Routes>
          {/* Public */}
          <Route path="/" element={<Home />} />
          <Route
            path="/login"
            element={
              <PublicOnlyRoute>
                <Login />
              </PublicOnlyRoute>
            }
          />
          <Route
            path="/register"
            element={
              <PublicOnlyRoute>
                <Register />
              </PublicOnlyRoute>
            }
          />

          {/* Protected */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/trips"
            element={
              <ProtectedRoute>
                <MyTrips />
              </ProtectedRoute>
            }
          />
          <Route
            path="/trips/:tripId"
            element={
              <ProtectedRoute>
                <TripWorkspace />
              </ProtectedRoute>
            }
          />
          <Route
            path="/expenses"
            element={
              <ProtectedRoute>
                <Expenses />
              </ProtectedRoute>
            }
          />
          <Route
            path="/manage"
            element={
              <ProtectedRoute>
                <ManageTrips />
              </ProtectedRoute>
            }
          />
          <Route
            path="/community"
            element={
              <ProtectedRoute>
                <Community />
              </ProtectedRoute>
            }
          />

          {/* Aliases (backwards compat) */}
          <Route
            path="/my-trips"
            element={<Navigate to="/trips" replace />}
          />
          <Route
            path="/manage-trips"
            element={<Navigate to="/manage" replace />}
          />

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </Router>
  );
}
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Mail, Lock } from 'lucide-react';
import AppHeader from '../components/layout/AppHeader';
import Footer from '../components/layout/Footer';
import Card from '../components/common/Card';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import useAuth from '../hooks/useAuth';
import useToast from '../hooks/useToast';

export default function Login() {
  const { login, status, error } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/dashboard';

  const [form, setForm] = useState({ email: '', password: '', remember: true });
  const [localErr, setLocalErr] = useState({});

  const submit = async (e) => {
    e.preventDefault();
    setLocalErr({});
    const errs = {};
    if (!form.email) errs.email = 'Email required';
    if (!form.password) errs.password = 'Password required';
    if (Object.keys(errs).length) return setLocalErr(errs);

    try {
      await login({ email: form.email, password: form.password });
      toast.success('Welcome back!');
      navigate(from, { replace: true });
    } catch (err) {
      toast.error(err.message || 'Login failed');
    }
  };

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto flex max-w-7xl justify-center px-4 py-14 sm:px-6 lg:px-8">
        <Card
          className="w-full max-w-md p-8"
          spatial
          style={{ transform: 'perspective(1000px) rotateX(1.5deg)' }}
        >
          <h1 className="text-2xl font-extrabold tracking-tight text-ink">
            Welcome back
          </h1>
          <p className="mt-1 text-sm text-muted">
            Sign in to continue planning safar.
          </p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <Input
              label="Email"
              type="email"
              leftIcon={<Mail className="h-4 w-4" />}
              placeholder="you@example.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              error={localErr.email}
            />
            <Input
              label="Password"
              type="password"
              leftIcon={<Lock className="h-4 w-4" />}
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              error={localErr.password}
            />

            <div className="flex items-center justify-between text-xs">
              <label className="inline-flex items-center gap-2 text-muted">
                <input
                  type="checkbox"
                  className="h-3.5 w-3.5 rounded border-line text-brand-500 focus:ring-brand-500/30"
                  checked={form.remember}
                  onChange={(e) =>
                    setForm({ ...form, remember: e.target.checked })
                  }
                />
                Remember me
              </label>
              <a
                className="font-medium text-brand-600 hover:text-brand-700"
                href="#"
              >
                Forgot password?
              </a>
            </div>

            {error && (
              <div className="rounded-inner border border-red-100 bg-red-50 p-3 text-xs text-red-600">
                {error}
              </div>
            )}

            <Button
              type="submit"
              size="lg"
              className="w-full"
              loading={status === 'loading'}
            >
              Sign in
            </Button>
          </form>

          <div className="my-6 flex items-center gap-3 text-xs text-muted">
            <div className="h-px flex-1 bg-line" />
            or continue with
            <div className="h-px flex-1 bg-line" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button variant="secondary" type="button">
              Google
            </Button>
            <Button variant="secondary" type="button">
              Apple
            </Button>
          </div>

          <p className="mt-6 text-center text-sm text-muted">
            New to SafarSplit?{' '}
            <Link
              to="/register"
              className="font-semibold text-brand-600 hover:text-brand-700"
            >
              Create account
            </Link>
          </p>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
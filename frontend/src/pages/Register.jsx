import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Phone, Lock, Wallet } from 'lucide-react';
import AppHeader from '../components/layout/AppHeader';
import Footer from '../components/layout/Footer';
import Card from '../components/common/Card';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import useAuth from '../hooks/useAuth';
import useToast from '../hooks/useToast';
import { DIET_OPTIONS } from '../utils/constants';

export default function Register() {
  const { register, status, error } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    upiId: '',
    dietary: 'any',
    password: '',
    confirm: '',
    agree: false,
  });
  const [localErr, setLocalErr] = useState({});

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.name) errs.name = 'Name required';
    if (!form.email) errs.email = 'Email required';
    if (!form.password || form.password.length < 8)
      errs.password = 'Min 8 characters';
    if (form.password !== form.confirm) errs.confirm = 'Passwords do not match';
    if (!form.agree) errs.agree = 'Please agree to the Terms';
    setLocalErr(errs);
    if (Object.keys(errs).length) return;

    try {
      await register({
        name: form.name,
        email: form.email,
        phone: form.phone || undefined,
        upiId: form.upiId || undefined,
        password: form.password,
        dietaryPreference: form.dietary,
      });
      toast.success('Account created — welcome aboard!');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      toast.error(err.message || 'Registration failed');
    }
  };

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto flex max-w-7xl justify-center px-4 py-14 sm:px-6 lg:px-8">
        <Card
          className="w-full max-w-xl p-8"
          spatial
          style={{ transform: 'perspective(1000px) rotateX(1deg)' }}
        >
          <h1 className="text-2xl font-extrabold tracking-tight text-ink">
            Create your account
          </h1>
          <p className="mt-1 text-sm text-muted">
            Safar bhi, hisaab bhi. Takes 30 seconds.
          </p>

          <form onSubmit={submit} className="mt-6 grid gap-4 md:grid-cols-2">
            <Input
              label="Full name"
              leftIcon={<User className="h-4 w-4" />}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              error={localErr.name}
              className="md:col-span-2"
            />
            <Input
              label="Email"
              type="email"
              leftIcon={<Mail className="h-4 w-4" />}
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              error={localErr.email}
            />
            <Input
              label="Phone (optional)"
              leftIcon={<Phone className="h-4 w-4" />}
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
            <Input
              label="UPI ID (optional)"
              leftIcon={<Wallet className="h-4 w-4" />}
              placeholder="name@bank"
              value={form.upiId}
              onChange={(e) => setForm({ ...form, upiId: e.target.value })}
              className="md:col-span-2"
            />
            <div className="md:col-span-2">
              <label className="mb-1.5 block text-xs font-medium text-ink">
                Dietary preference
              </label>
              <select
                className="input"
                value={form.dietary}
                onChange={(e) => setForm({ ...form, dietary: e.target.value })}
              >
                {DIET_OPTIONS.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>
            <Input
              label="Password"
              type="password"
              leftIcon={<Lock className="h-4 w-4" />}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              error={localErr.password}
            />
            <Input
              label="Confirm password"
              type="password"
              leftIcon={<Lock className="h-4 w-4" />}
              value={form.confirm}
              onChange={(e) => setForm({ ...form, confirm: e.target.value })}
              error={localErr.confirm}
            />

            <label className="md:col-span-2 mt-1 inline-flex items-start gap-2 text-xs text-muted">
              <input
                type="checkbox"
                className="mt-0.5 h-3.5 w-3.5 rounded border-line text-brand-500 focus:ring-brand-500/30"
                checked={form.agree}
                onChange={(e) => setForm({ ...form, agree: e.target.checked })}
              />
              <span>
                I agree to the{' '}
                <a className="font-medium text-brand-600" href="#">
                  Terms of Service
                </a>{' '}
                and{' '}
                <a className="font-medium text-brand-600" href="#">
                  Privacy Policy
                </a>
                .
              </span>
            </label>

            {localErr.agree && (
              <div className="md:col-span-2 text-xs text-red-500">
                {localErr.agree}
              </div>
            )}
            {error && (
              <div className="md:col-span-2 rounded-inner border border-red-100 bg-red-50 p-3 text-xs text-red-600">
                {error}
              </div>
            )}

            <Button
              type="submit"
              size="lg"
              className="md:col-span-2 w-full"
              loading={status === 'loading'}
            >
              Create account
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted">
            Already have an account?{' '}
            <Link
              to="/login"
              className="font-semibold text-brand-600 hover:text-brand-700"
            >
              Sign in
            </Link>
          </p>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
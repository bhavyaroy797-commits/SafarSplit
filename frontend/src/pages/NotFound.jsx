import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import AppHeader from '../components/layout/AppHeader';
import Footer from '../components/layout/Footer';
import Card from '../components/common/Card';
import Button from '../components/common/Button';

export default function NotFound() {
  return (
    <div className="min-h-screen">
      <AppHeader />

      <main className="mx-auto max-w-3xl px-4 py-20 sm:px-6 lg:px-8">
        <Card className="p-10 text-center" spatial>
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-inner bg-brand-50 text-brand-600">
            <Compass className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-ink">
            404
          </h1>
          <p className="mt-2 text-sm text-muted">
            Yeh raasta kahan jaata hai? Page not found.
          </p>
          <div className="mt-6 flex justify-center gap-2">
            <Link to="/">
              <Button variant="secondary">Go home</Button>
            </Link>
            <Link to="/dashboard">
              <Button>Open dashboard</Button>
            </Link>
          </div>
        </Card>
      </main>

      <Footer />
    </div>
  );
}
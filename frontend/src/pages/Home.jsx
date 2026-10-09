import { Link } from 'react-router-dom';
import {
  Search,
  Receipt,
  Wallet,
  Vote,
  MapPin,
  Clock,
  Star,
  Sparkles,
} from 'lucide-react';
import AppHeader from '../components/layout/AppHeader';
import Footer from '../components/layout/Footer';
import Button from '../components/common/Button';
import TripCover from '../components/trips/TripCover';
import TripTypeCard from '../components/trips/TripTypeCard';
import FeaturedTripCard from '../components/trips/FeaturedTripCard';
import useReveal from '../hooks/useReveal';
import { formatINR, durationDays } from '../utils/format';
import { TRIP_TYPES, pickCover } from '../utils/constants';

const demoFeatured = {
  id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
  title: 'Goa Weekend',
  destination: 'Goa',
  start_date: '2026-11-14',
  end_date: '2026-11-16',
  budget_paise: 800000,
};

const demoMore = [
  {
    id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2',
    title: 'Manali Snow Trip',
    destination: 'Manali',
    category: 'Mountain',
    budget_paise: 1500000,
    start_date: '2026-12-20',
    end_date: '2026-12-24',
  },
  {
    id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3',
    title: 'Jaipur Heritage',
    destination: 'Jaipur',
    category: 'Cultural',
    budget_paise: 650000,
    start_date: '2026-11-01',
    end_date: '2026-11-03',
  },
  {
    id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa4',
    title: 'Rishikesh Rafting',
    destination: 'Rishikesh',
    category: 'Adventure',
    budget_paise: 450000,
    start_date: '2026-10-12',
    end_date: '2026-10-14',
  },
];

const testimonials = [
  {
    quote:
      'Hisaab ho gaya in 2 minutes. UPI links made settling up with 6 friends painless.',
    name: 'Ananya · Bengaluru',
  },
  {
    quote:
      'Finally a planner that understands "Rahul ne 1200 diye dinner ke liye".',
    name: 'Karan · Mumbai',
  },
  {
    quote: 'Live voting saved our Goa itinerary. No more WhatsApp chaos.',
    name: 'Meera · Pune',
  },
];

export default function Home() {
  const revealRef = useReveal();

  return (
    <div ref={revealRef} className="min-h-screen">
      <AppHeader />

      {/* Hero */}
      <section className="mx-auto max-w-7xl px-4 pb-8 pt-12 sm:px-6 lg:px-8 lg:pt-20">
        <div className="reveal mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-pill border border-line bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">
            <Sparkles className="h-3 w-3" />
            Safar bhi, hisaab bhi
          </span>
          <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-ink sm:text-5xl lg:text-6xl">
            Chalo, plan karte hain.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-muted">
            Plan trips with your gang, vote on stops, split every rupee — and
            settle up with UPI in a single tap.
          </p>

          {/* Search bar */}
          <div className="mt-8 flex items-center gap-2 rounded-pill border border-line bg-white p-2 shadow-card">
            <Search className="ml-3 h-4 w-4 text-muted" />
            <input
              placeholder="Where do you want to go?"
              className="h-10 flex-1 bg-transparent px-2 text-sm outline-none placeholder:text-muted"
            />
            <Link to="/my-trips">
              <Button size="md">Explore trips</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-5 md:grid-cols-3">
          {[
            {
              icon: Receipt,
              title: 'Hinglish expense entry',
              desc: 'Type "Rahul ne 1200 diye dinner ke liye" — we parse it into a split.',
            },
            {
              icon: Wallet,
              title: 'Fewest UPI payments',
              desc: 'Minimum settle-up so only the fewest possible people pay each other.',
            },
            {
              icon: Vote,
              title: 'Live group voting',
              desc: 'Propose stops, vote up or down, watch counts update in real time.',
            },
          ].map((f) => (
            <div key={f.title} className="card spatial reveal p-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-inner bg-brand-50 text-brand-600">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-base font-bold text-ink">{f.title}</h3>
              <p className="mt-1.5 text-sm text-muted">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Browse by type */}
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="reveal mb-4">
          <div className="subtitle">Browse by trip type</div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {TRIP_TYPES.map((t, i) => (
            <div key={t.key} className="reveal">
              <TripTypeCard
                emoji={t.emoji}
                label={t.label}
                count={[1, 2, 1, 1, 1][i]}
                onClick={() => {}}
              />
            </div>
          ))}
        </div>
      </section>

      {/* Featured */}
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="reveal mb-4 flex items-end justify-between">
          <div>
            <div className="subtitle">Featured trip</div>
            <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-ink">
              Handpicked for your gang
            </h2>
          </div>
        </div>
        <div className="reveal">
          <FeaturedTripCard trip={demoFeatured} />
        </div>
      </section>

      {/* More trips */}
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="reveal mb-4 flex items-end justify-between">
          <div>
            <div className="subtitle">More trips</div>
            <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-ink">
              Trending with travellers
            </h2>
          </div>
          <Link
            to="/my-trips"
            className="text-sm font-semibold text-brand-600 hover:text-brand-700"
          >
            View all →
          </Link>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {demoMore.map((trip) => (
            <Link
              key={trip.id}
              to={`/trips/${trip.id}`}
              className="card spatial reveal group block overflow-hidden"
            >
              <TripCover
                destination={trip.destination}
                overlay
                rounded="rounded-none"
                className="h-44 w-full"
              >
                <span className="absolute left-3 top-3 rounded-pill bg-white/95 px-3 py-1 text-[11px] font-semibold text-ink backdrop-blur">
                  {trip.category}
                </span>
              </TripCover>
              <div className="space-y-1.5 p-4">
                <h3 className="text-[15px] font-bold text-ink group-hover:text-brand-600">
                  {trip.title}
                </h3>
                <div className="flex items-center gap-1.5 text-xs text-muted">
                  <MapPin className="h-3.5 w-3.5 text-brand-500" />
                  {trip.destination}
                </div>
                <div className="flex items-center gap-3 pt-1 text-xs text-muted">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {durationDays(trip.start_date, trip.end_date)}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 text-amber-400" />
                    4.6
                  </span>
                </div>
                <div className="pt-1 text-sm font-bold text-brand-600">
                  {formatINR(trip.budget_paise)}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="reveal mb-4">
          <div className="subtitle">What travellers are saying</div>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {testimonials.map((t) => (
            <div key={t.name} className="card spatial reveal p-6">
              <div className="flex gap-0.5 text-amber-400">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-current" />
                ))}
              </div>
              <p className="mt-3 text-sm text-ink">"{t.quote}"</p>
              <p className="mt-3 text-xs font-semibold text-muted">{t.name}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="card spatial reveal flex flex-col items-start justify-between gap-4 p-6 md:flex-row md:items-center md:p-8">
          <div>
            <h3 className="text-xl font-extrabold tracking-tight text-ink">
              Not sure where to start?
            </h3>
            <p className="mt-1 text-sm text-muted">
              Chalo trip banate hain — invite your gang in seconds.
            </p>
          </div>
          <Link to="/register">
            <Button size="lg">Create your first trip</Button>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
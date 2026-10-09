import { Phone, Mail, ShieldCheck } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="mt-20 border-t border-line bg-white">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-inner bg-brand-500 text-white shadow-glow">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                  <path d="M4 18c2-6 7-10 16-12-2 9-7 14-16 12z" />
                </svg>
              </span>
              <span className="text-[15px] font-extrabold tracking-tight text-ink">
                SafarSplit
              </span>
            </div>
            <p className="mt-2 text-sm text-muted">Safar bhi, hisaab bhi.</p>
          </div>

          <div className="space-y-2 text-sm text-muted">
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-brand-500" />
              <span>+91 993321417</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-brand-500" />
              <span>hello@safarsplit.in</span>
            </div>
          </div>

          <div className="flex items-start gap-2 text-sm text-muted md:justify-end">
            <ShieldCheck className="mt-0.5 h-4 w-4 text-emerald-500" />
            <span>Trusted by groups across India.</span>
          </div>
        </div>

        <div className="mt-8 border-t border-line pt-6 text-xs text-muted">
          © {new Date().getFullYear()} SafarSplit. Made with ❤️ in India.
        </div>
      </div>
    </footer>
  );
}
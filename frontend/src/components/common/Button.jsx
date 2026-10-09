import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

const base =
  'inline-flex items-center justify-center gap-2 rounded-pill font-medium transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30 disabled:opacity-60 disabled:cursor-not-allowed';

const sizes = {
  sm: 'h-9 px-4 text-sm',
  md: 'h-11 px-5 text-sm',
  lg: 'h-12 px-6 text-[15px]',
  xl: 'h-14 px-7 text-base',
};

const variants = {
  primary:
    'bg-brand-500 text-white shadow-glow hover:bg-brand-600 active:bg-brand-700',
  secondary:
    'bg-white text-ink border border-line hover:border-brand-300 hover:text-brand-600',
  ghost: 'bg-transparent text-ink hover:bg-brand-50 hover:text-brand-600',
  danger:
    'bg-red-500 text-white shadow-[0_10px_30px_-10px_rgba(239,68,68,0.5)] hover:bg-red-600',
  subtle: 'bg-brand-50 text-brand-700 hover:bg-brand-100',
};

const Button = forwardRef(function Button(
  {
    children,
    variant = 'primary',
    size = 'md',
    loading = false,
    leftIcon = null,
    rightIcon = null,
    className = '',
    ...rest
  },
  ref
) {
  return (
    <button
      ref={ref}
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
      disabled={loading || rest.disabled}
      {...rest}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        leftIcon && <span className="shrink-0">{leftIcon}</span>
      )}
      <span>{children}</span>
      {!loading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
    </button>
  );
});

export default Button;
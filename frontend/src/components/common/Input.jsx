import { forwardRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

const Input = forwardRef(function Input(
  {
    label,
    error,
    hint,
    leftIcon,
    type = 'text',
    className = '',
    id,
    ...rest
  },
  ref
) {
  const [show, setShow] = useState(false);
  const isPassword = type === 'password';
  const inputId = id || rest.name;
  const inputType = isPassword ? (show ? 'text' : 'password') : type;

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label
          htmlFor={inputId}
          className="mb-1.5 block text-xs font-medium text-ink"
        >
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
            {leftIcon}
          </div>
        )}
        <input
          id={inputId}
          ref={ref}
          type={inputType}
          className={`input ${leftIcon ? 'pl-9' : ''} ${
            isPassword ? 'pr-10' : ''
          } ${error ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20' : ''}`}
          {...rest}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted hover:text-ink"
            aria-label={show ? 'Hide password' : 'Show password'}
          >
            {show ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        )}
      </div>
      {error ? (
        <p className="mt-1 text-xs text-red-500">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-muted">{hint}</p>
      ) : null}
    </div>
  );
});

export default Input;
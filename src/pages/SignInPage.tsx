import { useState } from 'react';
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ArrowRight, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Logo from '../components/Logo';

type Tab = 'password' | 'google' | 'magic';

/* ── Google "G" SVG ── */
function GoogleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

export default function SignInPage() {
  const navigate         = useNavigate();
  const [searchParams]   = useSearchParams();
  const returnTo         = searchParams.get('returnTo') || '/account';
  const { signInWithPassword, signInWithGoogle, signInWithMagicLink } = useAuth();

  const [tab,           setTab]           = useState<Tab>('password');
  const [email,         setEmail]         = useState('');
  const [password,      setPassword]      = useState('');
  const [showPass,      setShowPass]      = useState(false);
  const [magicEmail,    setMagicEmail]    = useState('');
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState('');
  const [magicSent,     setMagicSent]     = useState(false);

  /* ── Email + password ── */
  const handlePasswordSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const err = await signInWithPassword(email, password);
    setLoading(false);
    if (err) {
      setError(err.message.includes('Invalid') ? 'Incorrect email or password.' : err.message);
    } else {
      navigate(returnTo);
    }
  };

  /* ── Google ── */
  const handleGoogle = async () => {
    setLoading(true);
    await signInWithGoogle();
    /* Page redirects — no setLoading(false) needed */
  };

  /* ── Magic link ── */
  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const err = await signInWithMagicLink(magicEmail);
    setLoading(false);
    if (err) {
      setError(err.message);
    } else {
      setMagicSent(true);
    }
  };

  const TABS: { id: Tab; label: string }[] = [
    { id: 'password', label: 'Email' },
    { id: 'google',   label: 'Google' },
    { id: 'magic',    label: 'Magic Link' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">

      {/* ── Dark hero header ── */}
      <div className="bg-slate-950 border-b border-white/[0.06]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 text-center">
          <RouterLink to="/" className="inline-block mb-6 hover:opacity-75 transition-opacity">
            <Logo size="md" variant="light" />
          </RouterLink>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            Welcome back
          </h1>
          <p className="text-slate-400 text-sm mt-2">Sign in to access your orders and saved details</p>
        </div>
      </div>

      {/* ── Auth card ── */}
      <div className="flex-1 flex items-start justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

            {/* Tab switcher */}
            <div className="flex border-b border-slate-100">
              {TABS.map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => { setTab(t.id); setError(''); }}
                  className={`flex-1 py-3.5 text-sm font-semibold transition-colors ${
                    tab === t.id
                      ? 'text-slate-900 border-b-2 border-slate-900 bg-slate-50'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="p-6">

              {/* Error */}
              {error && (
                <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200">
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}

              {/* ── Tab: Email + Password ── */}
              {tab === 'password' && (
                <form onSubmit={handlePasswordSignIn} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 outline-none text-slate-900 placeholder-slate-400 text-sm transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-sm font-semibold text-slate-700">Password</label>
                      <RouterLink to="/forgot-password" className="text-xs text-slate-500 hover:text-slate-900 transition-colors">
                        Forgot password?
                      </RouterLink>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type={showPass ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-11 py-3 rounded-xl border border-slate-200 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 outline-none text-slate-900 placeholder-slate-400 text-sm transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass(s => !s)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                        tabIndex={-1}
                      >
                        {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2.5 bg-slate-900 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl transition-colors mt-2"
                  >
                    {loading ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>Sign In <ArrowRight className="w-4 h-4" /></>
                    )}
                  </button>
                </form>
              )}

              {/* ── Tab: Google ── */}
              {tab === 'google' && (
                <div className="py-2">
                  <p className="text-sm text-slate-500 text-center mb-6">
                    Sign in instantly with your Google account — no password needed.
                  </p>
                  <button
                    type="button"
                    onClick={handleGoogle}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-50 border-2 border-slate-200 hover:border-slate-300 text-slate-800 font-semibold py-3.5 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
                    ) : (
                      <>
                        <GoogleIcon />
                        Continue with Google
                      </>
                    )}
                  </button>
                  <p className="text-center text-xs text-slate-400 mt-4">
                    You'll be redirected to Google to complete sign-in
                  </p>
                </div>
              )}

              {/* ── Tab: Magic Link ── */}
              {tab === 'magic' && (
                magicSent ? (
                  <div className="py-4 text-center">
                    <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto mb-4">
                      <Zap className="w-7 h-7 text-emerald-500" />
                    </div>
                    <h3 className="font-bold text-slate-900 mb-2">Check your inbox</h3>
                    <p className="text-sm text-slate-500">
                      We sent a magic link to <span className="font-semibold text-slate-700">{magicEmail}</span>.
                      Click it to sign in — the link expires in 1 hour.
                    </p>
                    <button
                      onClick={() => { setMagicSent(false); setMagicEmail(''); }}
                      className="mt-5 text-sm text-slate-500 hover:text-slate-900 underline underline-offset-2 transition-colors"
                    >
                      Use a different email
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleMagicLink} className="space-y-4">
                    <p className="text-sm text-slate-500 mb-2">
                      No password needed — we'll email you a secure sign-in link.
                    </p>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email</label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="email"
                          required
                          value={magicEmail}
                          onChange={e => setMagicEmail(e.target.value)}
                          placeholder="you@example.com"
                          className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 outline-none text-slate-900 placeholder-slate-400 text-sm transition-all"
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full flex items-center justify-center gap-2.5 bg-slate-900 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl transition-colors"
                    >
                      {loading ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <><Zap className="w-4 h-4" /> Send Magic Link</>
                      )}
                    </button>
                  </form>
                )
              )}
            </div>
          </div>

          {/* Register link */}
          <p className="text-center text-sm text-slate-500 mt-6">
            Don't have an account?{' '}
            <RouterLink
              to={returnTo !== '/account' ? `/register?returnTo=${encodeURIComponent(returnTo)}` : '/register'}
              className="text-slate-900 font-bold hover:underline underline-offset-2 transition-colors"
            >
              Create one →
            </RouterLink>
          </p>
        </div>
      </div>
    </div>
  );
}

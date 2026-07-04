import { useState } from 'react';
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, User, ArrowRight, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Logo from '../components/Logo';

export default function SignUpPage() {
  const navigate         = useNavigate();
  const [searchParams]   = useSearchParams();
  const returnTo         = searchParams.get('returnTo') || '/account';
  const { signUp } = useAuth();

  const [name,         setName]         = useState('');
  const [email,        setEmail]        = useState('');
  const [password,     setPassword]     = useState('');
  const [confirmPass,  setConfirmPass]  = useState('');
  const [showPass,     setShowPass]     = useState(false);
  const [showConfirm,  setShowConfirm]  = useState(false);
  const [disclaimer,   setDisclaimer]   = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState('');
  const [success,      setSuccess]      = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPass) {
      setError('Passwords do not match.');
      return;
    }
    if (!disclaimer) {
      setError('Please confirm the research use disclaimer.');
      return;
    }

    setLoading(true);
    const err = await signUp(email, password, name);
    setLoading(false);

    if (err) {
      if (err.message.includes('already registered')) {
        setError('An account with this email already exists. Try signing in.');
      } else {
        setError(err.message);
      }
    } else {
      setSuccess(true);
    }
  };

  /* Password strength indicator */
  const strength = password.length === 0 ? 0 : password.length < 8 ? 1 : password.length < 12 ? 2 : 3;
  const strengthLabels = ['', 'Weak', 'Good', 'Strong'];
  const strengthColors = ['', 'bg-red-400', 'bg-amber-400', 'bg-emerald-500'];

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <div className="bg-slate-950 border-b border-white/[0.06]">
          <div className="max-w-5xl mx-auto px-4 py-10 text-center">
            <RouterLink to="/" className="inline-block mb-6 hover:opacity-75 transition-opacity">
              <Logo size="md" variant="light" />
            </RouterLink>
          </div>
        </div>
        <div className="flex-1 flex items-start justify-center px-4 py-12">
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto mb-5">
              <CheckCircle className="w-8 h-8 text-emerald-500" />
            </div>
            <h2 className="text-xl font-extrabold text-slate-900 mb-2">Account created!</h2>
            <p className="text-slate-500 text-sm mb-2">
              We've sent a confirmation link to <span className="font-semibold text-slate-700">{email}</span>.
            </p>
            <p className="text-slate-400 text-xs mb-6">Check your inbox (and spam folder) and click the link to activate your account.</p>
            <button
              onClick={() => navigate('/signin')}
              className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-700 text-white font-bold px-6 py-3 rounded-xl transition-colors text-sm"
            >
              Go to Sign In <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">

      {/* ── Dark hero header ── */}
      <div className="bg-slate-950 border-b border-white/[0.06]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 text-center">
          <RouterLink to="/" className="inline-block mb-6 hover:opacity-75 transition-opacity">
            <Logo size="md" variant="light" />
          </RouterLink>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            Create your account
          </h1>
          <p className="text-slate-400 text-sm mt-2">Save your details, track orders, and checkout faster</p>
        </div>
      </div>

      {/* ── Register card ── */}
      <div className="flex-1 flex items-start justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">

            {error && (
              <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">

              {/* Full name */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Your full name"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 outline-none text-slate-900 placeholder-slate-400 text-sm transition-all"
                  />
                </div>
              </div>

              {/* Email */}
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

              {/* Password */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type={showPass ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Min. 8 characters"
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
                {/* Strength bar */}
                {password.length > 0 && (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 flex gap-1">
                      {[1, 2, 3].map(i => (
                        <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i <= strength ? strengthColors[strength] : 'bg-slate-100'}`} />
                      ))}
                    </div>
                    <span className={`text-xs font-semibold ${strength === 1 ? 'text-red-500' : strength === 2 ? 'text-amber-500' : 'text-emerald-500'}`}>
                      {strengthLabels[strength]}
                    </span>
                  </div>
                )}
              </div>

              {/* Confirm password */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    required
                    value={confirmPass}
                    onChange={e => setConfirmPass(e.target.value)}
                    placeholder="Repeat your password"
                    className={`w-full pl-10 pr-11 py-3 rounded-xl border focus:ring-2 outline-none text-slate-900 placeholder-slate-400 text-sm transition-all ${
                      confirmPass && confirmPass !== password
                        ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
                        : 'border-slate-200 focus:border-slate-900 focus:ring-slate-900/10'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(s => !s)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    tabIndex={-1}
                  >
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Research disclaimer */}
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={disclaimer}
                  onChange={e => setDisclaimer(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-slate-300 accent-slate-900 flex-shrink-0 cursor-pointer"
                />
                <span className="text-xs text-slate-500 leading-relaxed">
                  I confirm that all products are purchased for{' '}
                  <span className="font-semibold text-slate-700">laboratory / research purposes only</span>{' '}
                  and not for human consumption.
                </span>
              </label>

              <button
                type="submit"
                disabled={loading || !disclaimer}
                className="w-full flex items-center justify-center gap-2.5 bg-slate-900 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl transition-colors mt-2"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>Create Account <ArrowRight className="w-4 h-4" /></>
                )}
              </button>
            </form>
          </div>

          {/* Sign in link */}
          <p className="text-center text-sm text-slate-500 mt-6">
            Already have an account?{' '}
            <RouterLink
              to={returnTo !== '/account' ? `/signin?returnTo=${encodeURIComponent(returnTo)}` : '/signin'}
              className="text-slate-900 font-bold hover:underline underline-offset-2 transition-colors"
            >
              Sign in →
            </RouterLink>
          </p>
        </div>
      </div>
    </div>
  );
}

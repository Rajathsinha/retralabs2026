import { useState, useEffect } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, CheckCircle, AlertTriangle, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import Logo from '../components/Logo';

type PageState = 'loading' | 'ready' | 'invalid' | 'success';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const { loading: authLoading, recoveryMode } = useAuth();

  const [pageState,    setPageState]    = useState<PageState>('loading');
  const [password,     setPassword]     = useState('');
  const [confirm,      setConfirm]      = useState('');
  const [showPass,     setShowPass]     = useState(false);
  const [showConfirm,  setShowConfirm]  = useState(false);
  const [submitting,   setSubmitting]   = useState(false);
  const [error,        setError]        = useState('');

  // Wait for AuthContext to finish initialising — it processes the URL hash
  // fragment and fires PASSWORD_RECOVERY, which sets recoveryMode = true.
  useEffect(() => {
    if (authLoading) return; // Still processing the hash — keep spinner

    if (recoveryMode) {
      // Valid recovery token — show the form and strip the hash from the URL
      // so the token can't be replayed or bookmarked.
      window.history.replaceState(null, '', window.location.pathname);
      setPageState('ready');
    } else {
      // No PASSWORD_RECOVERY event fired — link is expired, already used,
      // or the user navigated here directly.
      setPageState('invalid');
    }
  }, [authLoading, recoveryMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setSubmitting(false);

    if (err) {
      setError(err.message);
    } else {
      setPageState('success');
      setTimeout(() => navigate('/account', { replace: true }), 2500);
    }
  };

  // Password strength
  const strength =
    password.length === 0 ? 0 :
    password.length < 8   ? 1 :
    password.length < 12  ? 2 : 3;
  const strengthColors = ['', 'bg-red-400', 'bg-amber-400', 'bg-emerald-500'];
  const strengthLabels = ['', 'Weak', 'Good', 'Strong'];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">

      {/* ── Dark hero header ── */}
      <div className="bg-slate-950 border-b border-white/[0.06]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 text-center">
          <RouterLink to="/" className="inline-block mb-6 hover:opacity-75 transition-opacity">
            <Logo size="md" variant="light" />
          </RouterLink>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            Set a new password
          </h1>
          <p className="text-slate-400 text-sm mt-2">
            {pageState === 'loading'
              ? 'Verifying your reset link…'
              : 'Choose a strong password for your account'}
          </p>
        </div>
      </div>

      <div className="flex-1 flex items-start justify-center px-4 py-12">
        <div className="w-full max-w-md">

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 min-h-[200px]">

            {/* ── Loading ── */}
            {pageState === 'loading' && (
              <div className="py-10 flex flex-col items-center gap-4">
                <div className="w-10 h-10 border-2 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
                <p className="text-sm text-slate-500">Verifying reset link…</p>
              </div>
            )}

            {/* ── Invalid / expired ── */}
            {pageState === 'invalid' && (
              <div className="py-6 text-center">
                <div className="w-14 h-14 rounded-full bg-red-50 border border-red-200 flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="w-7 h-7 text-red-500" />
                </div>
                <h3 className="font-bold text-slate-900 mb-2">Link expired or invalid</h3>
                <p className="text-sm text-slate-500 mb-6">
                  This password reset link has expired or has already been used. Please request a new one.
                </p>
                <RouterLink
                  to="/forgot-password"
                  className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-700 text-white font-bold px-6 py-3 rounded-xl transition-colors text-sm"
                >
                  Request a new link
                </RouterLink>
              </div>
            )}

            {/* ── Success ── */}
            {pageState === 'success' && (
              <div className="py-6 text-center">
                <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-7 h-7 text-emerald-500" />
                </div>
                <h3 className="font-bold text-slate-900 mb-2">Password updated!</h3>
                <p className="text-sm text-slate-500">
                  Your password has been changed successfully. Redirecting to your account…
                </p>
              </div>
            )}

            {/* ── Reset form ── */}
            {pageState === 'ready' && (
              <>
                {error && (
                  <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200">
                    <p className="text-red-700 text-sm">{error}</p>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">

                  {/* New password */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                      New Password
                    </label>
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
                            <div
                              key={i}
                              className={`h-1 flex-1 rounded-full transition-all ${
                                i <= strength ? strengthColors[strength] : 'bg-slate-100'
                              }`}
                            />
                          ))}
                        </div>
                        <span className={`text-xs font-semibold ${
                          strength === 1 ? 'text-red-500' :
                          strength === 2 ? 'text-amber-500' : 'text-emerald-500'
                        }`}>
                          {strengthLabels[strength]}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Confirm password */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type={showConfirm ? 'text' : 'password'}
                        required
                        value={confirm}
                        onChange={e => setConfirm(e.target.value)}
                        placeholder="Repeat your password"
                        className={`w-full pl-10 pr-11 py-3 rounded-xl border focus:ring-2 outline-none text-slate-900 placeholder-slate-400 text-sm transition-all ${
                          confirm && confirm !== password
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
                    {confirm && confirm !== password && (
                      <p className="mt-1.5 text-xs text-red-500">Passwords do not match</p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full flex items-center justify-center gap-2.5 bg-slate-900 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl transition-colors mt-2"
                  >
                    {submitting ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      'Update Password'
                    )}
                  </button>
                </form>
              </>
            )}
          </div>

          <div className="text-center mt-6">
            <RouterLink
              to="/signin"
              className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
            </RouterLink>
          </div>

        </div>
      </div>
    </div>
  );
}

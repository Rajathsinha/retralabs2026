import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import Logo from '../components/Logo';

export default function ForgotPasswordPage() {
  const [email,   setEmail]   = useState('');
  const [loading, setLoading] = useState(false);
  const [sent,    setSent]    = useState(false);
  const [error,   setError]   = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      // Supabase appends the hash tokens to this URL:
      // https://retralabs.in/reset-password#access_token=...&type=recovery
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setLoading(false);

    if (err) {
      setError(err.message);
    } else {
      setSent(true);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">

      {/* ── Dark hero header ── */}
      <div className="bg-slate-950 border-b border-white/[0.06]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 text-center">
          <RouterLink to="/" className="inline-block mb-6 hover:opacity-75 transition-opacity">
            <Logo size="md" variant="light" />
          </RouterLink>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            Reset your password
          </h1>
          <p className="text-slate-400 text-sm mt-2">We'll send a reset link to your inbox</p>
        </div>
      </div>

      <div className="flex-1 flex items-start justify-center px-4 py-12">
        <div className="w-full max-w-md">

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">

            {sent ? (
              <div className="py-4 text-center">
                <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-7 h-7 text-emerald-500" />
                </div>
                <h3 className="font-bold text-slate-900 mb-2">Check your inbox</h3>
                <p className="text-sm text-slate-500 mb-1">
                  We sent a password reset link to{' '}
                  <span className="font-semibold text-slate-700">{email}</span>.
                </p>
                <p className="text-xs text-slate-400 mb-6">The link expires in 1 hour. Check your spam folder if you don't see it.</p>
                <button
                  onClick={() => { setSent(false); setEmail(''); }}
                  className="text-sm text-slate-500 hover:text-slate-900 underline underline-offset-2 transition-colors"
                >
                  Try a different email
                </button>
              </div>
            ) : (
              <>
                {error && (
                  <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200">
                    <p className="text-red-700 text-sm">{error}</p>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email Address</label>
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

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2.5 bg-slate-900 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl transition-colors"
                  >
                    {loading ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      'Send Reset Link'
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

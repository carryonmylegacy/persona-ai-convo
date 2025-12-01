import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Brain } from 'lucide-react';

export function Auth() {
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--carry-on-navy)] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-[var(--carry-on-dark-blue)] rounded-2xl p-8 border border-[var(--carry-on-medium-blue)]">
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[var(--carry-on-accent-blue)] to-[var(--carry-on-medium-blue)] flex items-center justify-center">
              <Brain className="text-white" size={28} />
            </div>
            <span className="text-white text-2xl font-semibold">Carry On</span>
          </div>

          <h2 className="text-2xl font-bold text-white text-center mb-2">
            {isSignUp ? 'Create Account' : 'Welcome Back'}
          </h2>
          <p className="text-[var(--carry-on-gray)] text-center mb-6">
            {isSignUp ? 'Start building your digital legacy' : 'Sign in to continue'}
          </p>

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-white mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-[var(--carry-on-medium-blue)] border border-[var(--carry-on-medium-blue)] rounded-lg text-white placeholder-[var(--carry-on-gray)] focus:outline-none focus:ring-2 focus:ring-[var(--carry-on-accent-blue)]"
                placeholder="you@example.com"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-white mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-[var(--carry-on-medium-blue)] border border-[var(--carry-on-medium-blue)] rounded-lg text-white placeholder-[var(--carry-on-gray)] focus:outline-none focus:ring-2 focus:ring-[var(--carry-on-accent-blue)]"
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[var(--carry-on-accent-blue)] text-white py-3 rounded-lg font-medium hover:bg-opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Loading...' : isSignUp ? 'Sign Up' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-[var(--carry-on-accent-blue)] hover:underline text-sm"
            >
              {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

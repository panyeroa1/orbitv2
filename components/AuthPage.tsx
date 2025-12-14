import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Mail, Lock, ArrowRight, Loader2, AlertCircle, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import OrbitVisualizer from './OrbitVisualizer';

type AuthMode = 'login' | 'signup' | 'forgot';

const AuthPage: React.FC = () => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else if (mode === 'signup') {
        if (password !== confirmPassword) {
          throw new Error("Passwords do not match.");
        }
        const { error } = await supabase.auth.signUp({ 
          email, 
          password,
          options: {
            emailRedirectTo: window.location.origin
          }
        });
        if (error) throw error;
        setMessage({ type: 'success', text: 'Check your email for the confirmation link!' });
      } else if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin,
        });
        if (error) throw error;
        setMessage({ type: 'success', text: 'Password reset link sent to your email.' });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    setMessage(null);
    setPassword('');
    setConfirmPassword('');
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Ambience handled by global body styles, but adding local flair */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-neon-purple/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-neon/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md bg-surface/40 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-2xl relative z-10 overflow-hidden group">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-neon to-neon-purple" />
        
        {/* Header */}
        <div className="text-center mb-8 space-y-4">
          <div className="flex justify-center mb-4">
             <div className="scale-50 -my-8">
               <OrbitVisualizer isActive={loading} state={loading ? 'processing' : 'idle'} />
             </div>
          </div>
          <div>
            <h1 className="text-3xl font-display font-bold text-white tracking-tight">
              {mode === 'login' && 'Welcome Back'}
              {mode === 'signup' && 'Join Orbits'}
              {mode === 'forgot' && 'Reset Password'}
            </h1>
            <p className="text-secondary text-sm mt-2">
              {mode === 'login' && 'Enter your credentials to access the neural link.'}
              {mode === 'signup' && 'Create your identity in the Orbits network.'}
              {mode === 'forgot' && 'We will send a recovery signal to your email.'}
            </p>
          </div>
        </div>

        {/* Message Alert */}
        {message && (
          <div className={`mb-6 p-4 rounded-xl border flex items-start space-x-3 ${
            message.type === 'error' 
              ? 'bg-red-500/10 border-red-500/20 text-red-200' 
              : 'bg-green-500/10 border-green-500/20 text-green-200'
          } animate-in slide-in-from-top-2`}>
            {message.type === 'error' ? <AlertCircle size={20} className="shrink-0" /> : <CheckCircle2 size={20} className="shrink-0" />}
            <span className="text-sm font-medium">{message.text}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleAuth} className="space-y-5">
          <div className="space-y-4">
            <div className="relative group/input">
              <Mail className="absolute left-4 top-3.5 text-secondary group-focus-within/input:text-neon transition-colors" size={20} />
              <input
                type="email"
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder-white/30 focus:outline-none focus:border-neon transition-all"
              />
            </div>

            {mode !== 'forgot' && (
              <div className="relative group/input">
                <Lock className="absolute left-4 top-3.5 text-secondary group-focus-within/input:text-neon transition-colors" size={20} />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-12 pr-12 text-white placeholder-white/30 focus:outline-none focus:border-neon transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-3.5 text-secondary hover:text-white transition-colors focus:outline-none"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            )}

            {mode === 'signup' && (
              <div className="relative group/input animate-in slide-in-from-top-2 fade-in">
                <Lock className="absolute left-4 top-3.5 text-secondary group-focus-within/input:text-neon transition-colors" size={20} />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-12 pr-12 text-white placeholder-white/30 focus:outline-none focus:border-neon transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-3.5 text-secondary hover:text-white transition-colors focus:outline-none"
                >
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            )}
          </div>

          {mode === 'login' && (
            <div className="flex justify-end">
              <button 
                type="button"
                onClick={() => switchMode('forgot')}
                className="text-xs text-secondary hover:text-neon transition-colors"
              >
                Forgot Password?
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-neon text-black font-bold py-3 rounded-xl hover:bg-white transition-all shadow-[0_0_20px_rgba(0,243,255,0.2)] hover:shadow-[0_0_30px_rgba(0,243,255,0.4)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {loading ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <>
                {mode === 'login' && <span>Enter Orbit</span>}
                {mode === 'signup' && <span>Initialize</span>}
                {mode === 'forgot' && <span>Send Link</span>}
                <ArrowRight size={20} />
              </>
            )}
          </button>
        </form>

        {/* Footer Toggle */}
        <div className="mt-8 pt-6 border-t border-white/10 text-center">
          {mode === 'login' ? (
            <p className="text-sm text-secondary">
              New to Orbits?{' '}
              <button onClick={() => switchMode('signup')} className="text-neon font-bold hover:underline">
                Create Account
              </button>
            </p>
          ) : (
            <p className="text-sm text-secondary">
              Already have an account?{' '}
              <button onClick={() => switchMode('login')} className="text-neon font-bold hover:underline">
                Log In
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
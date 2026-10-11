import React, { useState } from 'react';
import { Lock, User, Eye, EyeOff, ShieldCheck, ArrowRight, Cloud, CheckCircle2 } from 'lucide-react';
import { getStoredAuthCredentials } from '../utils/storage';
import { signInWithGoogle } from '../firebase';

interface LoginScreenProps {
  onLoginSuccess: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('123');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleGoogleLogin = async () => {
    try {
      setIsGoogleLoading(true);
      setError('');
      const user = await signInWithGoogle();
      if (user) {
        localStorage.setItem('brother_finance_is_logged_in', 'true');
        onLoginSuccess();
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/unauthorized-domain') {
        setError('இந்த URL (domain) Firebase-ல் Authorized Domain ஆக சேர்க்கப்படவில்லை. AI Studio App link-ஐ பயன்படுத்தவும் அல்லது Firebase Console -> Auth -> Settings -> Authorized Domains-ல் உங்கள் domain-ஐ Add செய்யவும்.');
      } else {
        setError(err.message || 'Google Login failed. Please try again.');
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const stored = getStoredAuthCredentials();
    if (
      username.trim().toLowerCase() === stored.username.trim().toLowerCase() &&
      password.trim() === stored.password.trim()
    ) {
      setError('');
      localStorage.setItem('brother_finance_is_logged_in', 'true');
      onLoginSuccess();
    } else {
      setError('Invalid username or password');
    }
  };

  const handleQuickDemo = () => {
    setUsername('admin');
    setPassword('123');
    setError('');
    localStorage.setItem('brother_finance_is_logged_in', 'true');
    onLoginSuccess();
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col justify-center items-center p-4 selection:bg-emerald-500 selection:text-white">
      <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-xl p-6 sm:p-8">
        {/* App Branding */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-100 border border-emerald-200 text-emerald-700 mb-3.5 shadow-xs">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
            Palaniyandavar Finance
          </h1>
          <p className="text-xs font-bold text-emerald-700 tracking-wider mt-1 uppercase">
            Finance Tracking Ledger
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Weekly & Monthly Loan Management
          </p>
        </div>

        {/* Feature highlight: Permanent cross-device sync */}
        <div className="mb-5 p-3 rounded-2xl bg-gradient-to-r from-emerald-50 to-indigo-50 border border-emerald-200 text-xs text-slate-700 space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-emerald-900">
            <Cloud className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>நிரந்தர கிளவுட் சேமிப்பு (Never Erase Cloud Sync)</span>
          </div>
          <p className="text-[11px] text-slate-600 pl-5 leading-relaxed">
            நீங்கள் லேப்டாப்பில் பயன்படுத்தினாலும் அல்லது போனில் பயன்படுத்தினாலும் டேட்டா அழியாமல் உடனுக்குடன் Sync ஆகும்!
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium text-center">
            {error}
          </div>
        )}

        {/* 1-CLICK GOOGLE SIGN IN (HERO OPTION) */}
        <div className="mb-5">
          <button
            type="button"
            id="btn-google-login"
            onClick={handleGoogleLogin}
            disabled={isGoogleLoading}
            className="w-full py-3 px-4 bg-white hover:bg-slate-50 border-2 border-slate-300 hover:border-emerald-500 rounded-2xl text-xs sm:text-sm font-bold text-slate-800 flex items-center justify-center gap-3 transition-all cursor-pointer shadow-xs active:scale-98 disabled:opacity-50"
          >
            {/* Google SVG Icon */}
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>{isGoogleLoading ? 'இணைக்கப்படுகிறது...' : 'Google மூலம் உள்நுழைக (Laptop & Mobile Sync)'}</span>
          </button>
        </div>

        <div className="relative flex py-2 items-center mb-4">
          <div className="flex-grow border-t border-slate-200"></div>
          <span className="flex-shrink mx-3 text-[11px] font-semibold text-slate-400 uppercase">
            அல்லது கடவுச்சொல் மூலம்
          </span>
          <div className="flex-grow border-t border-slate-200"></div>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Username
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <User className="w-4 h-4" />
              </div>
              <input
                id="login-username-input"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username"
                required
                className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                id="login-password-input"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                required
                className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-700 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            id="login-submit-btn"
            type="submit"
            className="w-full mt-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
          >
            <span>Login to Ledger</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Quick helper note */}
        <div className="mt-5 pt-4 border-t border-slate-200 text-center">
          <p className="text-xs text-slate-500 mb-2">
            Default credentials: <span className="font-mono font-bold text-slate-700">admin / 123</span>
          </p>
          <button
            type="button"
            id="btn-quick-demo-login"
            onClick={handleQuickDemo}
            className="text-xs text-emerald-700 hover:underline font-semibold cursor-pointer"
          >
            Quick 1-Click Login →
          </button>
        </div>
      </div>
    </div>
  );
};

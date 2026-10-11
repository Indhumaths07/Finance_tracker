import React, { useState } from 'react';
import { Lock, User, Eye, EyeOff, ShieldCheck, ArrowRight } from 'lucide-react';
import { getStoredAuthCredentials } from '../utils/storage';

interface LoginScreenProps {
  onLoginSuccess: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('123');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

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
        <div className="text-center mb-7">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-100 border border-emerald-200 text-emerald-700 mb-4 shadow-xs">
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

        {error && (
          <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium text-center">
            {error}
          </div>
        )}

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
        <div className="mt-6 pt-4 border-t border-slate-200 text-center">
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

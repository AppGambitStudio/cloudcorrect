import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Cloud } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

type Mode = 'login' | 'signup' | 'confirm';

export default function LoginPage() {
    const { user, login, signup, confirmSignup, loading } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmCode, setConfirmCode] = useState('');
    const [mode, setMode] = useState<Mode>('login');
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const navigate = useNavigate();

    React.useEffect(() => {
        if (user) {
            navigate('/dashboard');
        }
    }, [user, navigate]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSubmitting(true);
        try {
            await login(email, password);
        } catch (err: any) {
            setError(err.message || 'Login failed');
        } finally {
            setSubmitting(false);
        }
    };

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSubmitting(true);
        try {
            await signup(email, password);
            setMode('confirm');
        } catch (err: any) {
            setError(err.message || 'Sign up failed');
        } finally {
            setSubmitting(false);
        }
    };

    const handleConfirm = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSubmitting(true);
        try {
            await confirmSignup(email, confirmCode);
            await login(email, password);
        } catch (err: any) {
            setError(err.message || 'Confirmation failed');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading || user) return <div className="flex items-center justify-center min-h-screen">Redirecting...</div>;

    const title = mode === 'login' ? 'Welcome Back' : mode === 'signup' ? 'Create Account' : 'Verify Email';
    const subtitle = mode === 'login'
        ? 'Enter your credentials to access your audits'
        : mode === 'signup'
            ? 'Start tracking your architectural intent'
            : 'Enter the verification code sent to your email';

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
            <div className="flex items-center space-x-2 text-blue-600 mb-8">
                <Cloud size={40} strokeWidth={2.5} />
                <span className="text-3xl font-black tracking-tight">CloudCorrect</span>
            </div>

            <Card className="w-[400px] shadow-2xl shadow-slate-200 border-slate-200/60 rounded-3xl overflow-hidden">
                <CardHeader className="bg-slate-900 text-white p-8">
                    <CardTitle className="text-2xl font-bold">{title}</CardTitle>
                    <p className="text-slate-400 text-sm mt-1">{subtitle}</p>
                </CardHeader>
                <CardContent className="p-8">
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
                            {error}
                        </div>
                    )}

                    {mode === 'login' && (
                        <form onSubmit={handleLogin} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-black uppercase text-slate-400">Email Address</label>
                                <Input
                                    className="h-12 border-slate-200 rounded-xl"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="name@company.com"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-black uppercase text-slate-400">Password</label>
                                <Input
                                    className="h-12 border-slate-200 rounded-xl"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                            <Button disabled={submitting} type="submit" className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-200 transition-all mt-4">
                                {submitting ? 'Signing In...' : 'Sign In'}
                            </Button>
                            <div className="text-center mt-6">
                                <button
                                    type="button"
                                    onClick={() => { setMode('signup'); setError(''); }}
                                    className="text-sm font-bold text-slate-400 hover:text-blue-600 transition-colors"
                                >
                                    New here? Create an account
                                </button>
                            </div>
                        </form>
                    )}

                    {mode === 'signup' && (
                        <form onSubmit={handleSignup} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-black uppercase text-slate-400">Email Address</label>
                                <Input
                                    className="h-12 border-slate-200 rounded-xl"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="name@company.com"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-black uppercase text-slate-400">Password</label>
                                <Input
                                    className="h-12 border-slate-200 rounded-xl"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                            <Button disabled={submitting} type="submit" className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-200 transition-all mt-4">
                                {submitting ? 'Creating Account...' : 'Create My Account'}
                            </Button>
                            <div className="text-center mt-6">
                                <button
                                    type="button"
                                    onClick={() => { setMode('login'); setError(''); }}
                                    className="text-sm font-bold text-slate-400 hover:text-blue-600 transition-colors"
                                >
                                    Already have an account? Sign in
                                </button>
                            </div>
                        </form>
                    )}

                    {mode === 'confirm' && (
                        <form onSubmit={handleConfirm} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-black uppercase text-slate-400">Verification Code</label>
                                <Input
                                    className="h-12 border-slate-200 rounded-xl"
                                    type="text"
                                    value={confirmCode}
                                    onChange={(e) => setConfirmCode(e.target.value)}
                                    placeholder="123456"
                                    required
                                />
                            </div>
                            <Button disabled={submitting} type="submit" className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-200 transition-all mt-4">
                                {submitting ? 'Verifying...' : 'Verify & Sign In'}
                            </Button>
                            <div className="text-center mt-6">
                                <button
                                    type="button"
                                    onClick={() => { setMode('login'); setError(''); }}
                                    className="text-sm font-bold text-slate-400 hover:text-blue-600 transition-colors"
                                >
                                    Back to Sign In
                                </button>
                            </div>
                        </form>
                    )}
                </CardContent>
            </Card>

            <p className="mt-8 text-xs font-medium text-slate-400">
                &copy; 2026 <a href="https://appgambit.com" target="_blank" rel="noopener noreferrer">APPGAMBiT</a>. Built for Architectural Integrity.
            </p>
        </div>
    );
}

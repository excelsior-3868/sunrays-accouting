import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Loader2, Eye, EyeOff, ArrowLeft } from 'lucide-react';

export default function LoginPage() {
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isForgotPassword, setIsForgotPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });
            if (error) throw error;
            navigate('/');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setMessage(null);

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/update-password`,
            });
            if (error) throw error;
            setMessage('Check your email for the password reset link.');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (isForgotPassword) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
                <div className="w-full max-w-sm overflow-hidden rounded-lg border bg-background shadow-lg">
                    <div className="flex flex-col items-center gap-2 p-6 text-center">
                        <div className="flex h-24 w-24 items-center justify-center -mb-2">
                            <img src="/logo.png" alt="Logo" className="h-full w-full object-contain" />
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight">Reset Password</h1>
                        <p className="text-sm text-muted-foreground">
                            Enter your email to receive a reset link
                        </p>
                    </div>
                    <div className="p-6 pt-0">
                        <form onSubmit={handleResetPassword} className="space-y-4">
                            {error && (
                                <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                                    {error}
                                </div>
                            )}
                            {message && (
                                <div className="rounded-md bg-green-50 p-3 text-sm text-green-600">
                                    {message}
                                </div>
                            )}
                            <div className="space-y-2">
                                <label className="text-sm font-medium" htmlFor="reset-email">Email</label>
                                <input
                                    id="reset-email"
                                    type="email"
                                    placeholder="m@example.com"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="inline-flex h-9 w-full items-center justify-center whitespace-nowrap rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                            >
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Send Reset Link
                            </button>
                        </form>
                        <div className="mt-4 text-center text-sm">
                            <button
                                type="button"
                                onClick={() => setIsForgotPassword(false)}
                                className="flex items-center justify-center gap-2 text-muted-foreground hover:text-blue-600"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                Back to Login
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
            <div className="w-full max-w-sm overflow-hidden rounded-lg border bg-background shadow-lg">
                <div className="flex flex-col items-center gap-2 p-6 text-center">
                    <div className="flex h-24 w-24 items-center justify-center -mb-2">
                        <img src="/logo.png" alt="Logo" className="h-full w-full object-contain" />
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight">School Lekha</h1>
                    <p className="text-sm text-muted-foreground">
                        Enter your credentials to access the system
                    </p>
                </div>
                <div className="p-6 pt-0">
                    <form onSubmit={handleLogin} className="space-y-4">
                        {error && (
                            <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                                {error}
                            </div>
                        )}
                        <div className="space-y-2">
                            <label className="text-sm font-medium" htmlFor="email">Email</label>
                            <input
                                id="email"
                                type="email"
                                placeholder="m@example.com"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                            />
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium" htmlFor="password">Password</label>
                                <button
                                    type="button"
                                    onClick={() => setIsForgotPassword(true)}
                                    className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                                >
                                    Forgot Password?
                                </button>
                            </div>
                            <div className="relative">
                                <input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 pr-9 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="inline-flex h-9 w-full items-center justify-center whitespace-nowrap rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                        >
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Sign In
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}

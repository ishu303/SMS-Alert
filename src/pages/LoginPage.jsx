import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Bell, LogIn, UserPlus, Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function LoginPage() {
    const { login, createAdmin, error, setError } = useAuth();
    const [mode, setMode] = useState('login'); // 'login' | 'create'
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [success, setSuccess] = useState(null);

    const switchMode = (newMode) => {
        setMode(newMode);
        setError(null);
        setSuccess(null);
        setName('');
        setEmail('');
        setPassword('');
    };

    // ── Sign In ───────────────────────────────────────────────
    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setSuccess(null);
        try {
            await login(email, password);
        } catch {
            // error handled in context
        } finally {
            setLoading(false);
        }
    };

    // ── Create Admin Account ──────────────────────────────────
    const handleCreate = async (e) => {
        e.preventDefault();
        if (!name.trim()) { setError('Name is required.'); return; }
        setLoading(true);
        setSuccess(null);
        try {
            await createAdmin(name.trim(), email.trim(), password);
            // createAdmin auto-logs in – this component will unmount
        } catch {
            // error handled in context
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-card">
                <div className="login-logo">
                    <img src="/app_logo_padded.png" alt="SMS Logo" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '12px' }} />
                </div>
                <h1 className="login-title">SMS Notify</h1>
                <p className="login-subtitle">Admin Dashboard</p>

                {/* Mode tabs */}
                <div style={{
                    display: 'flex', borderRadius: 10, overflow: 'hidden',
                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                    marginBottom: 24,
                }}>
                    <button type="button" onClick={() => switchMode('login')}
                        style={{
                            flex: 1, padding: '12px 0', border: 'none', cursor: 'pointer',
                            fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                            background: mode === 'login' ? 'var(--primary)' : 'transparent',
                            color: mode === 'login' ? '#fff' : 'var(--text-tertiary)',
                            transition: 'all 0.2s',
                        }}>
                        <LogIn size={15} /> Sign In
                    </button>
                    <button type="button" onClick={() => switchMode('create')}
                        style={{
                            flex: 1, padding: '12px 0', border: 'none', cursor: 'pointer',
                            fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                            background: mode === 'create' ? 'var(--primary)' : 'transparent',
                            color: mode === 'create' ? '#fff' : 'var(--text-tertiary)',
                            transition: 'all 0.2s',
                        }}>
                        <UserPlus size={15} /> Create Account
                    </button>
                </div>

                <form className="login-form" onSubmit={mode === 'login' ? handleLogin : handleCreate}>
                    {/* Error */}
                    {error && (
                        <div className="form-error" style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                            <AlertCircle size={16} style={{ marginTop: 2, flexShrink: 0 }} />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Success */}
                    {success && (
                        <div style={{
                            background: 'rgba(0,230,118,0.08)', border: '1px solid rgba(0,230,118,0.2)',
                            borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#00e676',
                            display: 'flex', alignItems: 'center', gap: 8,
                        }}>
                            <CheckCircle2 size={16} /> {success}
                        </div>
                    )}

                    {/* Name (create mode only) */}
                    {mode === 'create' && (
                        <div className="form-group">
                            <label className="form-label" htmlFor="name">Your Name</label>
                            <input
                                id="name" type="text" className="form-input"
                                placeholder="e.g. Dr. Sharma"
                                value={name}
                                onChange={(e) => { setName(e.target.value); setError(null); }}
                                required
                            />
                        </div>
                    )}

                    {/* Email */}
                    <div className="form-group">
                        <label className="form-label" htmlFor="email">Email Address</label>
                        <input
                            id="email" type="email" className="form-input"
                            placeholder="admin@college.edu"
                            value={email}
                            onChange={(e) => { setEmail(e.target.value); setError(null); }}
                            required autoComplete="email"
                        />
                    </div>

                    {/* Password */}
                    <div className="form-group">
                        <label className="form-label" htmlFor="password">
                            {mode === 'create' ? 'Create Password' : 'Password'}
                        </label>
                        <div style={{ position: 'relative' }}>
                            <input
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                className="form-input"
                                placeholder={mode === 'create' ? 'Min 6 characters' : 'Enter your password'}
                                value={password}
                                onChange={(e) => { setPassword(e.target.value); setError(null); }}
                                required autoComplete={mode === 'create' ? 'new-password' : 'current-password'}
                                minLength={6}
                                style={{ paddingRight: 44 }}
                            />
                            <button type="button" onClick={() => setShowPassword(!showPassword)}
                                style={{
                                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                                    background: 'none', border: 'none', cursor: 'pointer',
                                    color: 'var(--text-tertiary)', padding: 4,
                                }}>
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    {/* Submit */}
                    <button
                        type="submit" className="btn btn-primary btn-full"
                        disabled={loading}
                        style={{ marginTop: 12, padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                    >
                        {loading ? (
                            <span className="loading-spinner" style={{ width: 22, height: 22, borderWidth: 2 }} />
                        ) : mode === 'login' ? (
                            <><LogIn size={18} /> Sign In</>
                        ) : (
                            <><UserPlus size={18} /> Create Admin Account</>
                        )}
                    </button>
                </form>

                {/* Hint */}
                <p style={{
                    textAlign: 'center', marginTop: 20, fontSize: 12,
                    color: 'var(--text-tertiary)', lineHeight: 1.6,
                }}>
                    {mode === 'login'
                        ? "Don't have an admin account? Switch to Create Account tab."
                        : 'This creates an admin account with full dashboard access. Use your college email.'
                    }
                </p>
            </div>
        </div>
    );
}

import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Bell } from 'lucide-react';

export default function LoginPage() {
    const { login, error, setError } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await login(email, password);
        } catch {
            // error is set in AuthContext
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-card">
                <div className="login-logo">
                    <Bell />
                </div>
                <h1 className="login-title">SMS Notify</h1>
                <p className="login-subtitle">Admin Dashboard — Sign in to manage notifications</p>

                <form className="login-form" onSubmit={handleSubmit}>
                    {error && (
                        <div className="form-error">{error}</div>
                    )}

                    <div className="form-group">
                        <label className="form-label" htmlFor="email">Email Address</label>
                        <input
                            id="email"
                            type="email"
                            className="form-input"
                            placeholder="admin@college.edu"
                            value={email}
                            onChange={(e) => { setEmail(e.target.value); setError(null); }}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="password">Password</label>
                        <input
                            id="password"
                            type="password"
                            className="form-input"
                            placeholder="Enter your password"
                            value={password}
                            onChange={(e) => { setPassword(e.target.value); setError(null); }}
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary btn-full"
                        disabled={loading}
                        style={{ marginTop: 8, padding: '16px' }}
                    >
                        {loading ? (
                            <span className="loading-spinner" style={{ width: 22, height: 22, borderWidth: 2 }} />
                        ) : (
                            'Sign In'
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}

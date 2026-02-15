import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

export default function Login() {
    const [formData, setFormData] = useState({ username_or_email: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Error en el login');

            login(data.usuario, data.access_token, data.refresh_token);
            navigate('/');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <h2>🌦️ ClimaGuru</h2>
                <h3>Iniciar Sesión</h3>
                {error && <div className="error-alert">⚠️ {error}</div>}
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Usuario o Email</label>
                        <input
                            type="text"
                            required
                            value={formData.username_or_email}
                            onChange={(e) => setFormData({ ...formData, username_or_email: e.target.value })}
                            placeholder="admin o email@ejemplo.com"
                        />
                    </div>
                    <div className="form-group">
                        <label>Contraseña</label>
                        <input
                            type="password"
                            required
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            placeholder="••••••••"
                        />
                    </div>
                    <button type="submit" className="auth-button" disabled={loading}>
                        {loading ? 'Entrando...' : 'Entrar'}
                    </button>
                </form>
                <p className="auth-footer">
                    ¿No tienes cuenta? <Link to="/register">Regístrate aquí</Link>
                </p>
            </div>

            <style>{`
        .auth-container {
          height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #0f1117;
        }
        .auth-card {
          background: #1a1d27;
          padding: 2.5rem;
          border-radius: 12px;
          border: 1px solid #2a2d3a;
          width: 100%;
          max-width: 400px;
          text-align: center;
        }
        .auth-card h2 {
          background: linear-gradient(135deg, #3b82f6, #10b981);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          font-size: 2rem;
          margin-bottom: 0.5rem;
        }
        .auth-card h3 {
          color: #e4e6eb;
          margin-bottom: 2rem;
          font-weight: 500;
        }
        .form-group {
          text-align: left;
          margin-bottom: 1.5rem;
        }
        .form-group label {
          display: block;
          color: #8b8fa3;
          font-size: 0.85rem;
          margin-bottom: 0.5rem;
        }
        .form-group input {
          width: 100%;
          padding: 0.75rem 1rem;
          background: #22252f;
          border: 1px solid #2a2d3a;
          border-radius: 8px;
          color: white;
          outline: none;
        }
        .form-group input:focus {
          border-color: #3b82f6;
        }
        .auth-button {
          width: 100%;
          padding: 0.75rem;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          margin-top: 1rem;
        }
        .auth-button:disabled {
          opacity: 0.5;
        }
        .auth-footer {
          margin-top: 1.5rem;
          color: #8b8fa3;
          font-size: 0.9rem;
        }
        .auth-footer a {
          color: #3b82f6;
          text-decoration: none;
        }
      `}</style>
        </div>
    );
}

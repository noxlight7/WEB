import { createContext, useContext, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { api, errorMessage, refreshCsrf } from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadSession() {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/auth/me/');
      setUser(data.user);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSession();
  }, []);

  async function authenticate(mode, values) {
    // Всегда получаем свежий токен, в том числе после смены сессии в другой вкладке.
    await refreshCsrf();
    const { data } = await api.post(`/auth/${mode}/`, values);
    setUser(data.user);
    setError('');
    await refreshCsrf(); // При входе Django меняет секрет CSRF.
  }

  async function logout() {
    await refreshCsrf();
    await api.post('/auth/logout/');
    setUser(null);
    await refreshCsrf();
  }

  return (
    <AuthContext.Provider
      value={{ user, loading, error, authenticate, logout, loadSession }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export function RequireAuth({ children }) {
  const { user, loading, error, loadSession } = useAuth();
  const location = useLocation();
  if (loading)
    return (
      <div className="page-state" role="status">
        Открываем кабинет…
      </div>
    );
  if (error)
    return (
      <div className="page-state">
        <p role="alert">{error}</p>
        <button className="button secondary" onClick={loadSession}>
          Попробовать снова
        </button>
      </div>
    );
  if (!user)
    return <Navigate to="/auth" state={{ from: location.pathname }} replace />;
  return children;
}

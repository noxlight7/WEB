import { useEffect, useState } from 'react';
import {
  Link,
  NavLink,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import { RequireAuth, useAuth } from './auth';
import { errorMessage } from './api';
import { ErrorNotice, Icon } from './components/UI';
import Catalog from './pages/Catalog';
import BookPage from './pages/BookPage';
import Reader from './pages/Reader';
import AuthPage from './pages/AuthPage';
import Studio from './pages/Studio';
import BookEditor from './pages/BookEditor';
import ChapterEditor from './pages/ChapterEditor';

export default function App() {
  const { user, loading, logout } = useAuth();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    window.scrollTo(0, 0);
    setError('');
  }, [location.pathname]);

  async function signOut() {
    setBusy(true);
    try {
      await logout();
      navigate('/');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <a className="skip-link" href="#main">
        Перейти к содержимому
      </a>
      <header className="site-header">
        <div className="header-inner">
          <Link to="/" className="brand" aria-label="Переплёт — на главную">
            <span className="brand-mark">
              <Icon name="book" size={21} />
            </span>
            переплёт<span className="brand-period">.</span>
          </Link>
          <nav className="main-nav" aria-label="Основная навигация">
            <NavLink to="/" end>
              Библиотека
            </NavLink>
            <NavLink to="/studio">Мои книги</NavLink>
          </nav>
          <div className="account-nav">
            {loading ? (
              <span className="muted">Загрузка…</span>
            ) : user ? (
              <>
                <span className="user-name">{user.display_name}</span>
                <button
                  className="logout-button"
                  disabled={busy}
                  onClick={signOut}
                >
                  {busy ? 'Выходим…' : 'Выйти'}
                </button>
              </>
            ) : (
              <Link className="button small secondary" to="/auth">
                Войти <Icon name="arrow" size={16} />
              </Link>
            )}
          </div>
        </div>
      </header>
      <main id="main" className="main-content">
        <ErrorNotice>{error}</ErrorNotice>
        <Routes>
          <Route path="/" element={<Catalog />} />
          <Route path="/books/:bookId" element={<BookPage />} />
          <Route
            path="/books/:bookId/chapters/:chapterId"
            element={<Reader />}
          />
          <Route path="/auth" element={<AuthPage />} />
          <Route
            path="/studio"
            element={
              <RequireAuth>
                <Studio />
              </RequireAuth>
            }
          />
          <Route
            path="/studio/new"
            element={
              <RequireAuth>
                <BookEditor />
              </RequireAuth>
            }
          />
          <Route
            path="/studio/books/:bookId"
            element={
              <RequireAuth>
                <BookEditor />
              </RequireAuth>
            }
          />
          <Route
            path="/studio/books/:bookId/chapters/new"
            element={
              <RequireAuth>
                <ChapterEditor />
              </RequireAuth>
            }
          />
          <Route
            path="/studio/books/:bookId/chapters/:chapterId"
            element={
              <RequireAuth>
                <ChapterEditor />
              </RequireAuth>
            }
          />
          <Route
            path="*"
            element={
              <div className="empty-state">
                <span className="eyebrow">404</span>
                <h1>Эта страница потерялась</h1>
                <p>Попробуйте начать с библиотеки.</p>
                <Link className="button" to="/">
                  К книгам <Icon name="arrow" />
                </Link>
              </div>
            }
          />
        </Routes>
      </main>
      <footer className="site-footer">
        <span className="footer-brand">переплёт.</span>
        <span>Истории, которые хочется читать.</span>
        <Link to="/studio/new">
          Написать свою <Icon name="pen" size={15} />
        </Link>
      </footer>
    </>
  );
}

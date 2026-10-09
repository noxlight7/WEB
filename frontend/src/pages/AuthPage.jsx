import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { errorMessage } from '../api';
import { ErrorNotice, Icon, Loading } from '../components/UI';

export default function AuthPage() {
  const { user, loading, authenticate } = useAuth();
  const [mode, setMode] = useState('login');
  const [values, setValues] = useState({
    username: '',
    password: '',
    display_name: '',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const from = location.state?.from;
  const destination =
    typeof from === 'string' && from.startsWith('/studio') ? from : '/studio';
  if (loading) return <Loading />;
  if (user) return <Navigate to={destination} replace />;

  function update(event) {
    setValues({ ...values, [event.target.name]: event.target.value });
  }
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await authenticate(
        mode,
        mode === 'login'
          ? { username: values.username, password: values.password }
          : values,
      );
      navigate(destination, { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-layout">
      <aside className="auth-story">
        <p className="eyebrow">ВАША АВТОРСКАЯ СТРАНИЦА</p>
        <h1>
          У каждой истории
          <br />
          есть <em>свой автор.</em>
        </h1>
        <p>Пусть следующая будет вашей.</p>
        <div className="auth-monogram" aria-hidden="true">
          П.
        </div>
        <span className="auth-footnote">
          Первая глава уже ближе, чем кажется.
        </span>
      </aside>
      <section className="auth-form-panel">
        <div className="auth-switch" aria-label="Режим входа">
          <button
            aria-pressed={mode === 'login'}
            className={mode === 'login' ? 'selected' : ''}
            onClick={() => {
              setMode('login');
              setError('');
            }}
            disabled={busy}
          >
            Вход
          </button>
          <button
            aria-pressed={mode === 'register'}
            className={mode === 'register' ? 'selected' : ''}
            onClick={() => {
              setMode('register');
              setError('');
            }}
            disabled={busy}
          >
            Регистрация
          </button>
        </div>
        <h2>{mode === 'login' ? 'С возвращением' : 'Начнём знакомство'}</h2>
        <p className="muted">
          {mode === 'login'
            ? 'Войдите, чтобы продолжить свои истории.'
            : 'Создайте аккаунт, чтобы публиковать книги.'}
        </p>
        <form onSubmit={submit}>
          <ErrorNotice>{error}</ErrorNotice>
          {mode === 'register' && (
            <div className="field">
              <label htmlFor="display_name">Имя автора</label>
              <input
                id="display_name"
                name="display_name"
                value={values.display_name}
                onChange={update}
                maxLength={150}
                autoComplete="name"
                required
                disabled={busy}
              />
              <span className="field-hint">Так вас увидят читатели.</span>
            </div>
          )}
          <div className="field">
            <label htmlFor="username">Логин</label>
            <input
              id="username"
              name="username"
              value={values.username}
              onChange={update}
              maxLength={150}
              autoComplete="username"
              autoCapitalize="none"
              required
              disabled={busy}
            />
            {mode === 'register' && (
              <span className="field-hint">
                Буквы, цифры и символы @ . + - _
              </span>
            )}
          </div>
          <div className="field">
            <label htmlFor="password">Пароль</label>
            <input
              type="password"
              id="password"
              name="password"
              value={values.password}
              onChange={update}
              autoComplete={
                mode === 'login' ? 'current-password' : 'new-password'
              }
              minLength={mode === 'register' ? 8 : undefined}
              required
              disabled={busy}
            />
            {mode === 'register' && (
              <span className="field-hint">
                Не менее 8 символов. Избегайте простых паролей.
              </span>
            )}
          </div>
          <button className="button full-width" disabled={busy}>
            {busy
              ? 'Подождите…'
              : mode === 'login'
                ? 'Войти в кабинет'
                : 'Создать аккаунт'}
            <Icon name="arrow" size={18} />
          </button>
        </form>
        <p className="auth-read-link">
          Для чтения аккаунт не нужен. <Link to="/">К книгам</Link>
        </p>
      </section>
    </div>
  );
}

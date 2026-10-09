import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { booksApi, chaptersApi, errorMessage } from '../api';
import { useAuth } from '../auth';
import ConfirmDelete from '../components/ConfirmDelete';
import {
  BackLink,
  chapterLabel,
  EmptyState,
  ErrorNotice,
  Icon,
  Loading,
} from '../components/UI';

export default function BookEditor() {
  const { bookId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [values, setValues] = useState({ title: '', description: '' });
  const [chapters, setChapters] = useState([]);
  const [loading, setLoading] = useState(Boolean(bookId));
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  useEffect(() => {
    let active = true;
    setSaved(false);
    setError('');
    setLoadError('');
    if (!bookId) {
      setValues({ title: '', description: '' });
      setChapters([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([booksApi.get(bookId), chaptersApi.list(bookId)])
      .then(([book, list]) => {
        if (!active) return;
        if (book.author.id !== user.id) {
          setLoadError('Редактировать эту книгу может только её автор.');
          return;
        }
        setValues({ title: book.title, description: book.description });
        setChapters(list);
      })
      .catch((err) => {
        if (active) setLoadError(errorMessage(err));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [bookId, user.id]);

  async function save(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setSaved(false);
    try {
      if (bookId) {
        const updated = await booksApi.update(bookId, values);
        setValues({ title: updated.title, description: updated.description });
        setSaved(true);
      } else {
        const book = await booksApi.create(values);
        navigate(`/studio/books/${book.id}`, { replace: true });
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function confirmDeletion() {
    setBusy(true);
    setError('');
    setSaved(false);
    try {
      if (pendingDelete.kind === 'book') {
        await booksApi.remove(bookId);
        navigate('/studio', { replace: true });
      } else {
        await chaptersApi.remove(pendingDelete.chapter.id);
        setChapters((current) =>
          current.filter((item) => item.id !== pendingDelete.chapter.id),
        );
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
      setPendingDelete(null);
    }
  }

  if (loading) return <Loading />;
  if (loadError)
    return (
      <div className="narrow-page">
        <BackLink to="/studio">Мои книги</BackLink>
        <ErrorNotice>{loadError}</ErrorNotice>
      </div>
    );
  return (
    <div className="editor-page">
      <BackLink to="/studio">Мои книги</BackLink>
      <section className="page-heading compact">
        <div>
          <p className="eyebrow">МАСТЕРСКАЯ АВТОРА</p>
          <h1>{bookId ? 'Ваша книга' : 'Новая история'}</h1>
        </div>
        {bookId && (
          <Link className="button secondary" to={`/books/${bookId}`}>
            Как видят читатели
            <Icon name="arrow" size={17} />
          </Link>
        )}
      </section>
      <div className="editor-layout">
        <div>
          <form className="editor-form" onSubmit={save}>
            <h2>О книге</h2>
            <ErrorNotice>{error}</ErrorNotice>
            {saved && (
              <div className="notice success" role="status">
                <Icon name="check" size={18} />
                Книга сохранена.
              </div>
            )}
            <div className="field">
              <label htmlFor="book-title">Название</label>
              <input
                id="book-title"
                value={values.title}
                onChange={(e) => {
                  setValues({ ...values, title: e.target.value });
                  setSaved(false);
                }}
                maxLength={160}
                required
                disabled={busy}
                placeholder="Как называется ваша история?"
              />
            </div>
            <div className="field">
              <label htmlFor="book-description">Описание</label>
              <textarea
                id="book-description"
                value={values.description}
                onChange={(e) => {
                  setValues({ ...values, description: e.target.value });
                  setSaved(false);
                }}
                maxLength={2000}
                rows={6}
                disabled={busy}
                placeholder="Несколько слов, с которых начнётся знакомство читателя с книгой."
              />
              <span className="field-hint">
                {values.description.length} / 2000
              </span>
            </div>
            <button className="button" disabled={busy}>
              {busy
                ? 'Сохраняем…'
                : bookId
                  ? 'Сохранить книгу'
                  : 'Создать книгу'}
              <Icon name="check" size={18} />
            </button>
          </form>
          {bookId && (
            <section className="editor-chapters">
              <div className="section-heading">
                <h2>
                  Главы <span className="count-label">{chapters.length}</span>
                </h2>
                <Link
                  className="text-link"
                  to={`/studio/books/${bookId}/chapters/new`}
                >
                  <Icon name="plus" size={17} />
                  Добавить главу
                </Link>
              </div>
              {chapters.length ? (
                <ol className="chapter-list editable">
                  {chapters.map((chapter) => (
                    <li key={chapter.id}>
                      <Link
                        to={`/studio/books/${bookId}/chapters/${chapter.id}`}
                      >
                        <span className="chapter-number">
                          {String(chapter.number).padStart(2, '0')}
                        </span>
                        <span className="chapter-title">{chapter.title}</span>
                        <Icon name="pen" size={17} />
                      </Link>
                      <button
                        className="icon-button danger-text"
                        title={`Удалить главу ${chapter.number}`}
                        aria-label={`Удалить главу ${chapter.number}`}
                        disabled={busy}
                        onClick={() =>
                          setPendingDelete({ kind: 'chapter', chapter })
                        }
                      >
                        <Icon name="trash" size={18} />
                      </button>
                    </li>
                  ))}
                </ol>
              ) : (
                <EmptyState
                  title="Самое время для первой главы"
                  action={
                    <Link
                      className="button secondary"
                      to={`/studio/books/${bookId}/chapters/new`}
                    >
                      Добавить главу
                    </Link>
                  }
                >
                  Начните историю с нескольких строк.
                </EmptyState>
              )}
            </section>
          )}
        </div>
        <aside className="editor-aside">
          <p className="eyebrow">НА ПОЛЯХ</p>
          <h3>
            Сначала слова.
            <br />
            <em>Потом целый мир.</em>
          </h3>
          <p>
            {bookId
              ? 'Сохранённые изменения сразу доступны читателям. Номера определяют порядок глав.'
              : 'Сначала создайте книгу, затем добавьте главы. Название и описание можно изменить в любой момент.'}
          </p>
          {bookId && (
            <>
              <div className="aside-stat">
                <strong>{chapters.length}</strong>
                <span>
                  {chapterLabel(chapters.length).split(' ').slice(1).join(' ')}{' '}
                  в книге
                </span>
              </div>
              <button
                className="text-link danger-text"
                onClick={() => setPendingDelete({ kind: 'book' })}
                disabled={busy}
              >
                <Icon name="trash" size={16} />
                Удалить книгу
              </button>
            </>
          )}
        </aside>
      </div>
      {pendingDelete && (
        <ConfirmDelete
          title={
            pendingDelete.kind === 'book' ? 'Удалить книгу?' : 'Удалить главу?'
          }
          busy={busy}
          onCancel={() => setPendingDelete(null)}
          onConfirm={confirmDeletion}
        >
          {pendingDelete.kind === 'book'
            ? `Книга «${values.title}» и все её главы будут удалены. Это действие нельзя отменить.`
            : `Глава «${pendingDelete.chapter.title}» будет удалена. Это действие нельзя отменить.`}
        </ConfirmDelete>
      )}
    </div>
  );
}

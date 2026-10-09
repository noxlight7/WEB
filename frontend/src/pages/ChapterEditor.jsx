import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { booksApi, chaptersApi, errorMessage } from '../api';
import { useAuth } from '../auth';
import { BackLink, ErrorNotice, Icon, Loading } from '../components/UI';

export default function ChapterEditor() {
  const { bookId, chapterId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [book, setBook] = useState(null);
  const [values, setValues] = useState({ number: 1, title: '', text: '' });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    setLoadError('');
    setSaved(false);
    Promise.all([
      booksApi.get(bookId),
      chapterId ? chaptersApi.get(chapterId) : chaptersApi.list(bookId),
    ])
      .then(([bookData, result]) => {
        if (!active) return;
        if (bookData.author.id !== user.id) {
          setLoadError('Редактировать главы может только автор книги.');
          return;
        }
        if (chapterId && result.book !== Number(bookId)) {
          setLoadError('Этой главы нет в выбранной книге.');
          return;
        }
        setBook(bookData);
        setValues(
          chapterId
            ? { number: result.number, title: result.title, text: result.text }
            : {
                number: Math.min(
                  9999,
                  Math.max(0, ...result.map((item) => item.number)) + 1,
                ),
                title: '',
                text: '',
              },
        );
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
  }, [bookId, chapterId, user.id]);

  function update(event) {
    setValues({ ...values, [event.target.name]: event.target.value });
    setSaved(false);
  }
  async function save(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setSaved(false);
    const payload = { ...values, number: Number(values.number) };
    try {
      if (chapterId) {
        const updated = await chaptersApi.update(chapterId, payload);
        setValues({
          number: updated.number,
          title: updated.title,
          text: updated.text,
        });
        setSaved(true);
      } else {
        const chapter = await chaptersApi.create(bookId, payload);
        navigate(`/studio/books/${bookId}/chapters/${chapter.id}`, {
          replace: true,
        });
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
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
    <div className="chapter-editor-page">
      <BackLink to={`/studio/books/${bookId}`}>{book.title}</BackLink>
      <section className="page-heading compact">
        <div>
          <p className="eyebrow">МАСТЕРСКАЯ АВТОРА</p>
          <h1>{chapterId ? 'Редактирование главы' : 'Новая глава'}</h1>
        </div>
        {chapterId && (
          <Link
            className="button secondary"
            to={`/books/${bookId}/chapters/${chapterId}`}
          >
            Открыть для чтения
            <Icon name="arrow" size={17} />
          </Link>
        )}
      </section>
      <form className="editor-form chapter-form" onSubmit={save}>
        <ErrorNotice>{error}</ErrorNotice>
        {saved && (
          <div className="notice success" role="status">
            <Icon name="check" size={18} />
            Глава сохранена.
          </div>
        )}
        <div className="chapter-fields">
          <div className="field">
            <label htmlFor="chapter-number">Номер</label>
            <input
              id="chapter-number"
              name="number"
              type="number"
              min="1"
              max="9999"
              value={values.number}
              onChange={update}
              disabled={busy}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="chapter-title">Название главы</label>
            <input
              id="chapter-title"
              name="title"
              value={values.title}
              onChange={update}
              maxLength={160}
              disabled={busy}
              required
              placeholder="У каждой главы есть начало"
            />
          </div>
        </div>
        <div className="field">
          <label htmlFor="chapter-text">Текст</label>
          <textarea
            id="chapter-text"
            name="text"
            className="writing-area"
            value={values.text}
            onChange={update}
            maxLength={100000}
            rows={18}
            disabled={busy}
            required
            placeholder="Начните здесь…"
          />
          <span className="field-hint">
            {values.text.length.toLocaleString('ru-RU')} / 100 000 символов ·
            обычный текст, переносы строк сохраняются
          </span>
        </div>
        <div className="form-footer">
          <span className="muted">
            После сохранения глава доступна читателям.
          </span>
          <button className="button" disabled={busy}>
            {busy
              ? 'Сохраняем…'
              : chapterId
                ? 'Сохранить главу'
                : 'Опубликовать главу'}
            <Icon name="check" size={18} />
          </button>
        </div>
      </form>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { booksApi, chaptersApi, errorMessage } from '../api';
import { BackLink, ErrorNotice, Icon, Loading } from '../components/UI';

export default function Reader() {
  const { bookId, chapterId } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    Promise.all([
      booksApi.get(bookId),
      chaptersApi.list(bookId),
      chaptersApi.get(chapterId),
    ])
      .then(([book, chapters, chapter]) => {
        if (active) {
          if (chapter.book !== Number(bookId))
            setError('Этой главы нет в выбранной книге.');
          else setData({ book, chapters, chapter });
        }
      })
      .catch((err) => {
        if (active) setError(errorMessage(err));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [bookId, chapterId]);

  if (loading) return <Loading>Открываем главу…</Loading>;
  if (error)
    return (
      <div className="narrow-page">
        <BackLink to={`/books/${bookId}`}>К книге</BackLink>
        <ErrorNotice>{error}</ErrorNotice>
      </div>
    );
  const { book, chapters, chapter } = data;
  const index = chapters.findIndex((item) => item.id === chapter.id);
  const previous = chapters[index - 1];
  const next = chapters[index + 1];
  return (
    <div className="reader-page">
      <BackLink to={`/books/${bookId}`}>{book.title}</BackLink>
      <div className="reader-layout">
        <aside className="reader-sidebar">
          <p className="eyebrow">ОГЛАВЛЕНИЕ</p>
          <nav aria-label="Главы книги">
            {chapters.map((item) => (
              <Link
                className={item.id === chapter.id ? 'current' : ''}
                aria-current={item.id === chapter.id ? 'page' : undefined}
                key={item.id}
                to={`/books/${bookId}/chapters/${item.id}`}
              >
                <span>{String(item.number).padStart(2, '0')}</span>
                {item.title}
              </Link>
            ))}
          </nav>
        </aside>
        <article className="reader-article">
          <header>
            <p className="eyebrow">
              ГЛАВА {chapter.number} <span className="tiny-divider" />{' '}
              {book.author.display_name}
            </p>
            <h1>{chapter.title}</h1>
            <span className="reader-ornament" aria-hidden="true">
              ✦
            </span>
          </header>
          <div className="chapter-text">{chapter.text}</div>
          <div className="reading-end" aria-hidden="true">
            · · ·
          </div>
          <nav className="reader-navigation" aria-label="Навигация по книге">
            {previous ? (
              <Link
                className="button secondary"
                to={`/books/${bookId}/chapters/${previous.id}`}
              >
                <Icon name="back" size={17} />
                Предыдущая глава
              </Link>
            ) : (
              <Link className="button secondary" to={`/books/${bookId}`}>
                К оглавлению
              </Link>
            )}
            {next ? (
              <Link
                className="button"
                to={`/books/${bookId}/chapters/${next.id}`}
              >
                Следующая глава
                <Icon name="arrow" size={17} />
              </Link>
            ) : (
              <Link className="button" to="/">
                Другие истории
                <Icon name="arrow" size={17} />
              </Link>
            )}
          </nav>
        </article>
      </div>
    </div>
  );
}

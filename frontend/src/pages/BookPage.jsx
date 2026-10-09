import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { booksApi, chaptersApi, errorMessage } from '../api';
import { useAuth } from '../auth';
import {
  BackLink,
  BookCover,
  chapterLabel,
  EmptyState,
  ErrorNotice,
  formatDate,
  Icon,
  Loading,
} from '../components/UI';

export default function BookPage() {
  const { bookId } = useParams();
  const { user } = useAuth();
  const [book, setBook] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    Promise.all([booksApi.get(bookId), chaptersApi.list(bookId)])
      .then(([bookData, chapterData]) => {
        if (active) {
          setBook(bookData);
          setChapters(chapterData);
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
  }, [bookId]);

  if (loading) return <Loading />;
  if (error)
    return (
      <div className="narrow-page">
        <BackLink to="/">В библиотеку</BackLink>
        <ErrorNotice>{error}</ErrorNotice>
      </div>
    );
  return (
    <div className="book-page">
      <BackLink to="/">В библиотеку</BackLink>
      <section className="book-layout">
        <BookCover book={book} large />
        <div className="book-intro">
          <p className="eyebrow">АВТОРСКАЯ КНИГА</p>
          <h1>{book.title}</h1>
          <p className="byline">{book.author.display_name}</p>
          <p className="intro-description">
            {book.description || 'Автор ещё не добавил описание.'}
          </p>
          <div className="book-meta">
            <span>
              <Icon name="book" size={17} />
              {chapterLabel(chapters.length)}
            </span>
            <span>На полке с {formatDate(book.created_at)}</span>
          </div>
          <div className="actions">
            {chapters.length > 0 && (
              <Link
                className="button"
                to={`/books/${bookId}/chapters/${chapters[0].id}`}
              >
                Начать читать <Icon name="arrow" size={18} />
              </Link>
            )}
            {user?.id === book.author.id && (
              <Link className="button secondary" to={`/studio/books/${bookId}`}>
                <Icon name="pen" size={17} />
                Редактировать
              </Link>
            )}
          </div>
        </div>
      </section>
      <section className="contents-section">
        <div className="section-heading">
          <h2>Оглавление</h2>
          <span className="muted">{chapterLabel(chapters.length)}</span>
        </div>
        {chapters.length ? (
          <ol className="chapter-list">
            {chapters.map((chapter) => (
              <li key={chapter.id}>
                <Link to={`/books/${bookId}/chapters/${chapter.id}`}>
                  <span className="chapter-number">
                    {String(chapter.number).padStart(2, '0')}
                  </span>
                  <span className="chapter-title">{chapter.title}</span>
                  <Icon name="arrow" size={19} />
                </Link>
              </li>
            ))}
          </ol>
        ) : (
          <EmptyState
            title="История скоро начнётся"
            action={
              user?.id === book.author.id && (
                <Link
                  className="button"
                  to={`/studio/books/${bookId}/chapters/new`}
                >
                  Добавить первую главу
                </Link>
              )
            }
          >
            Автор пока не добавил ни одной главы.
          </EmptyState>
        )}
      </section>
    </div>
  );
}

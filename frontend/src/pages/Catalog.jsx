import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { booksApi, errorMessage } from '../api';
import BookCard from '../components/BookCard';
import { EmptyState, ErrorNotice, Icon, Loading } from '../components/UI';

export default function Catalog() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    booksApi
      .list()
      .then((data) => {
        if (active) setBooks(data);
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
  }, [attempt]);

  return (
    <div className="catalog-page">
      <section className="page-heading catalog-heading">
        <div>
          <p className="eyebrow">НЕЗАВИСИМАЯ АВТОРСКАЯ БИБЛИОТЕКА</p>
          <h1>
            Каждая история
            <br />
            начинается <em>со строки.</em>
          </h1>
          <p className="heading-description">
            Читайте новые книги по главам.
            <br className="mobile-break" /> Или найдите слова для своей.
          </p>
        </div>
        <Link to="/studio/new" className="button">
          <Icon name="pen" size={18} />
          Написать книгу
        </Link>
      </section>
      <div className="section-heading">
        <h2>На книжной полке</h2>
        <span className="muted">
          {!loading && !error
            ? `${books.length} ${books.length === 1 ? 'история' : books.length >= 2 && books.length <= 4 ? 'истории' : 'историй'}`
            : 'Авторские истории'}
        </span>
      </div>
      {loading ? (
        <Loading />
      ) : error ? (
        <div className="page-state">
          <ErrorNotice>{error}</ErrorNotice>
          <button
            className="button secondary"
            onClick={() => setAttempt(attempt + 1)}
          >
            Попробовать снова
          </button>
        </div>
      ) : books.length ? (
        <div className="book-grid">
          {books.map((book) => (
            <BookCard key={book.id} book={book} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="Первая история — ваша"
          action={
            <Link className="button" to="/studio/new">
              Написать книгу
            </Link>
          }
        >
          На полке пока нет книг. Добавьте ту, которую давно хотели написать.
        </EmptyState>
      )}
      <aside className="catalog-note">
        <span className="note-number">01 — ∞</span>
        <p>
          От первой главы
          <br />
          <em>до последней точки.</em>
        </p>
        <span>Место для ваших слов.</span>
      </aside>
    </div>
  );
}

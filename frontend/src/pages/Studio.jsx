import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { booksApi, errorMessage } from '../api';
import { useAuth } from '../auth';
import BookCard from '../components/BookCard';
import { EmptyState, ErrorNotice, Icon, Loading } from '../components/UI';

export default function Studio() {
  const { user } = useAuth();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    booksApi
      .list(true)
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
  }, [user.id]);
  return (
    <div>
      <section className="page-heading">
        <div>
          <p className="eyebrow">КАБИНЕТ АВТОРА · {user.display_name}</p>
          <h1>Мои книги</h1>
          <p className="heading-description">
            Продолжите начатое. Или откройте новую страницу.
          </p>
        </div>
        <Link className="button" to="/studio/new">
          <Icon name="plus" size={18} />
          Новая книга
        </Link>
      </section>
      <ErrorNotice>{error}</ErrorNotice>
      {loading ? (
        <Loading />
      ) : (
        !error &&
        (books.length ? (
          <div className="book-grid">
            {books.map((book) => (
              <BookCard key={book.id} book={book} manage />
            ))}
          </div>
        ) : (
          <EmptyState
            title="Здесь будут ваши книги"
            action={
              <Link className="button" to="/studio/new">
                <Icon name="pen" size={18} />
                Написать первую книгу
              </Link>
            }
          >
            Начните с названия и небольшого описания. Главы можно добавлять
            постепенно.
          </EmptyState>
        ))
      )}
    </div>
  );
}

import { Link } from 'react-router-dom';
import { BookCover, chapterLabel, Icon } from './UI';

export default function BookCard({ book, manage = false }) {
  return (
    <article className="book-card">
      <Link
        to={`/books/${book.id}`}
        className="cover-link"
        tabIndex={-1}
        aria-hidden="true"
      >
        <BookCover book={book} />
      </Link>
      <div className="book-card-copy">
        <p className="eyebrow author-name">{book.author.display_name}</p>
        <h2>
          <Link to={`/books/${book.id}`}>{book.title}</Link>
        </h2>
        <p className="book-description">
          {book.description || 'Новая история ждёт своих читателей.'}
        </p>
        <div className="card-bottom">
          <span>{chapterLabel(book.chapter_count)}</span>
          <Link
            to={manage ? `/studio/books/${book.id}` : `/books/${book.id}`}
            className="text-link"
          >
            {manage ? 'Редактировать' : 'Открыть книгу'}
            <Icon name={manage ? 'pen' : 'arrow'} size={17} />
          </Link>
        </div>
      </div>
    </article>
  );
}

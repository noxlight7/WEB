import { Link } from 'react-router-dom';

export function Icon({ name, size = 20, ...props }) {
  const paths = {
    arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,
    back: <path d="M19 12H5m5-5-5 5 5 5" />,
    plus: <path d="M12 5v14M5 12h14" />,
    pen: (
      <>
        <path d="m15 5 4 4M4 20l5-1L20 8a2.8 2.8 0 0 0-4-4L5 15l-1 5Z" />
        <path d="M13 20h7" />
      </>
    ),
    book: (
      <>
        <path d="M12 5C8 3 4 3 2 4v15c3-1 6-1 10 1 4-2 7-2 10-1V4c-2-1-6-1-10 1ZM12 5v15" />
      </>
    ),
    trash: (
      <>
        <path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {paths[name] || paths.book}
    </svg>
  );
}

export function ErrorNotice({ children }) {
  return children ? (
    <div className="notice error" role="alert">
      {children}
    </div>
  ) : null;
}

export function Loading({ children = 'Загружаем страницы…' }) {
  return (
    <div className="page-state" role="status">
      <span className="loading-dot" />
      {children}
    </div>
  );
}

export function EmptyState({ title, children, action }) {
  return (
    <div className="empty-state">
      <Icon name="book" size={34} />
      <h2>{title}</h2>
      <p>{children}</p>
      {action}
    </div>
  );
}

export function BackLink({ to, children }) {
  return (
    <Link className="back-link" to={to}>
      <Icon name="back" size={16} />
      {children}
    </Link>
  );
}

export function chapterLabel(count) {
  const last = count % 10;
  const teen = count % 100;
  return `${count} ${teen >= 11 && teen <= 14 ? 'глав' : last === 1 ? 'глава' : last >= 2 && last <= 4 ? 'главы' : 'глав'}`;
}

export function formatDate(value) {
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
  }).format(new Date(value));
}

export function BookCover({ book, large = false }) {
  return (
    <div
      className={`book-cover cover-${(book.id - 1) % 6} ${large ? 'cover-large' : ''}`}
      aria-hidden="true"
    >
      <span className="cover-imprint">ПЕРЕПЛЁТ · АВТОРСКАЯ БИБЛИОТЕКА</span>
      <span className="cover-title">{book.title}</span>
      <span className="cover-author">{book.author.display_name}</span>
      <span className="cover-rule" />
    </div>
  );
}

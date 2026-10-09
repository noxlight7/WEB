import { useEffect, useRef } from 'react';

export default function ConfirmDelete({
  title,
  children,
  busy,
  onCancel,
  onConfirm,
}) {
  const dialogRef = useRef(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    dialog.showModal();
    return () => dialog.close();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className="confirm-dialog"
      aria-labelledby="delete-title"
      aria-describedby="delete-description"
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onCancel();
      }}
    >
      <p className="eyebrow">УДАЛЕНИЕ</p>
      <h2 id="delete-title">{title}</h2>
      <p id="delete-description">{children}</p>
      <div className="actions">
        <button
          type="button"
          className="button secondary"
          disabled={busy}
          onClick={onCancel}
          autoFocus
        >
          Отмена
        </button>
        <button
          type="button"
          className="button delete-button"
          disabled={busy}
          onClick={onConfirm}
        >
          {busy ? 'Удаляем…' : 'Удалить'}
        </button>
      </div>
    </dialog>
  );
}

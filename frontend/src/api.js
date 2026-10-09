import axios from 'axios';

// Vite и nginx направляют /api в Django: общие схема, хост и порт для cookie сессии и CSRF.
export const api = axios.create({ baseURL: '/api/v1', timeout: 15000 });

export async function refreshCsrf() {
  const { data } = await api.get('/auth/csrf/');
  return data.csrfToken;
}

api.interceptors.request.use(async (config) => {
  if (!['get', 'head', 'options'].includes(config.method)) {
    // Читаем cookie перед каждым изменением: вход в другой вкладке обновляет её значение.
    const cookie = document.cookie
      .split('; ')
      .find((value) => value.startsWith('csrftoken='));
    config.headers['X-CSRFToken'] = cookie
      ? decodeURIComponent(cookie.slice('csrftoken='.length))
      : await refreshCsrf();
  }
  return config;
});

export function errorMessage(error) {
  if (!error.response)
    return 'Не удалось связаться с сервером. Проверьте соединение и попробуйте ещё раз.';
  const data = error.response.data;
  if (typeof data?.detail === 'string') return data.detail;
  const labels = {
    title: 'Название',
    description: 'Описание',
    number: 'Номер главы',
    text: 'Текст',
    username: 'Логин',
    password: 'Пароль',
    display_name: 'Имя автора',
    non_field_errors: '',
  };
  if (data && typeof data === 'object') {
    return Object.entries(data)
      .map(([key, value]) => {
        const message = Array.isArray(value) ? value.join(' ') : String(value);
        return `${labels[key] ? `${labels[key]}: ` : ''}${message}`;
      })
      .join(' ');
  }
  return 'Не удалось выполнить действие. Попробуйте ещё раз.';
}

export const booksApi = {
  list: (mine = false) =>
    api.get(`/books/${mine ? '?mine=1' : ''}`).then((r) => r.data),
  get: (id) => api.get(`/books/${id}/`).then((r) => r.data),
  create: (values) => api.post('/books/', values).then((r) => r.data),
  update: (id, values) => api.put(`/books/${id}/`, values).then((r) => r.data),
  remove: (id) => api.delete(`/books/${id}/`),
};

export const chaptersApi = {
  list: (bookId) => api.get(`/books/${bookId}/chapters/`).then((r) => r.data),
  get: (id) => api.get(`/chapters/${id}/`).then((r) => r.data),
  create: (bookId, values) =>
    api.post(`/books/${bookId}/chapters/`, values).then((r) => r.data),
  update: (id, values) =>
    api.put(`/chapters/${id}/`, values).then((r) => r.data),
  remove: (id) => api.delete(`/chapters/${id}/`),
};

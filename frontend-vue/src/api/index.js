// Адрес бэкенда берётся из файла .env (переменная VITE_API_URL).
// Меняется только там, после изменения нужно перезапустить pnpm dev.
const API_URL = import.meta.env.VITE_API_URL

// Универсальная функция запросов к API (GET, POST, PATCH, PUT, DELETE).
// Возвращает { ok, status, data }, как и в старом api.js.
export async function apiRequest(path, method = 'GET', body = null) {
  const options = {
    method: method,
    credentials: 'include', // чтобы браузер отправлял cookie сессии
  }

  if (body instanceof FormData) {
    // Для FormData Content-Type не указываем: браузер поставит сам
    options.body = body
  } else if (body !== null) {
    options.headers = { 'Content-Type': 'application/json' }
    options.body = JSON.stringify(body)
  }

  const response = await fetch(`${API_URL}${path}`, options)

  // Если сервер вернул не JSON (например, пустой ответ 204), не ломаемся
  let data = null
  try {
    data = await response.json()
  } catch (error) {
    data = null
  }

  return { ok: response.ok, status: response.status, data: data }
}

// Адрес нужен и в других местах (например, для картинок новостей: API_URL + image_url)
export { API_URL }

import { API_URL } from './api'

// Превращает дату ISO в читаемый вид
export function formatDate(isoString) {
  if (!isoString) return ''
  return new Date(isoString).toLocaleString('ru-RU')
}

// Может ли пользователь удалить объект (пост или комментарий): автор или админ
export function canDelete(item, user) {
  if (!user || !item || !item.author) return false
  return user.role === 'admin' || item.author.id === user.id
}

// Имя автора: display_name, а если его нет — username
export function authorName(author) {
  return author.display_name || author.username
}

// Полный адрес картинки (бэкенд отдаёт путь вида /uploads/abc.png)
export function imageSrc(imageUrl) {
  return `${API_URL}${imageUrl}`
}

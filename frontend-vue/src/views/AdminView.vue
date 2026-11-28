<script setup>
import { ref, onMounted } from 'vue'
import { apiRequest } from '../api'
import { useMessageStore } from '../stores/message'
import { formatDate } from '../utils'

const message = useMessageStore()

// ---------------- Оповещения ----------------
const announcements = ref([])
const announcementsLoaded = ref(false)
const annTitle = ref('')
const annText = ref('')

async function loadAnnouncements() {
  try {
    const result = await apiRequest('/api/announcements')
    if (!result.ok || !Array.isArray(result.data)) {
      message.show('Не удалось загрузить оповещения')
      return
    }
    announcements.value = result.data
    announcementsLoaded.value = true
  } catch (error) {
    message.serverError()
  }
}

async function createAnnouncement() {
  message.clear()
  const title = annTitle.value.trim()
  const text = annText.value.trim()
  if (!title || !text) return

  try {
    const result = await apiRequest('/api/announcements', 'POST', { title, text })
    if (result.ok) {
      annTitle.value = ''
      annText.value = ''
      await loadAnnouncements()
    } else if (result.status === 422) {
      message.show('Проверьте длину заголовка и текста')
    } else {
      message.show('Не удалось создать оповещение')
    }
  } catch (error) {
    message.serverError()
  }
}

async function deleteAnnouncement(id) {
  message.clear()
  try {
    const result = await apiRequest(`/api/announcements/${id}`, 'DELETE')
    if (result.ok) {
      await loadAnnouncements()
    } else {
      message.show('Не удалось удалить оповещение')
    }
  } catch (error) {
    message.serverError()
  }
}

// ---------------- Новости ----------------
const newsList = ref([])
const newsLoaded = ref(false)

const editingId = ref(null) // null — создание новости, число — редактирование
const editingHasImage = ref(false) // есть ли у редактируемой новости картинка
const newsTitle = ref('')
const newsCategory = ref('')
const newsText = ref('')
const removeImage = ref(false)

// Ссылки на элементы страницы (ref="..." в шаблоне)
const imageInput = ref(null)
const newsFormSection = ref(null)

async function loadNews() {
  try {
    const result = await apiRequest('/api/news?limit=100')
    if (!result.ok || !Array.isArray(result.data)) {
      message.show('Не удалось загрузить новости')
      return
    }
    newsList.value = result.data
    newsLoaded.value = true
  } catch (error) {
    message.serverError()
  }
}

// Возвращает форму новости в режим создания
function resetNewsForm() {
  editingId.value = null
  editingHasImage.value = false
  newsTitle.value = ''
  newsCategory.value = ''
  newsText.value = ''
  removeImage.value = false
  if (imageInput.value) {
    imageInput.value.value = '' // очищаем выбранный файл
  }
}

function cancelEdit() {
  message.clear()
  resetNewsForm()
}

// Заполняет форму данными новости (полный текст берём отдельным запросом)
async function startEdit(id) {
  message.clear()
  try {
    const result = await apiRequest(`/api/news/${id}`)
    if (!result.ok || !result.data) {
      message.show('Не удалось загрузить данные новости')
      return
    }

    const item = result.data
    editingId.value = item.id
    editingHasImage.value = Boolean(item.image_url)
    newsTitle.value = item.title || ''
    newsCategory.value = item.category || ''
    newsText.value = item.text || ''
    removeImage.value = false
    if (imageInput.value) {
      imageInput.value.value = ''
    }
    if (newsFormSection.value) {
      newsFormSection.value.scrollIntoView({ behavior: 'smooth' })
    }
  } catch (error) {
    message.serverError()
  }
}

// Создание (POST) или изменение (PUT) новости. Отправляем FormData, потому что есть картинка.
async function saveNews() {
  message.clear()

  const formData = new FormData()
  formData.append('title', newsTitle.value.trim())
  formData.append('category', newsCategory.value.trim())
  formData.append('text', newsText.value.trim())

  if (imageInput.value && imageInput.value.files.length > 0) {
    formData.append('image', imageInput.value.files[0])
  }
  if (editingId.value !== null && removeImage.value) {
    formData.append('remove_image', 'true')
  }

  const path = editingId.value === null ? '/api/news' : `/api/news/${editingId.value}`
  const method = editingId.value === null ? 'POST' : 'PUT'

  try {
    const result = await apiRequest(path, method, formData)
    if (result.ok) {
      resetNewsForm()
      await loadNews()
    } else if (result.status === 413) {
      message.show('Картинка слишком большая (максимум 5 МБ)')
    } else if (result.status === 415) {
      message.show('Допустимы картинки PNG, JPEG, GIF и WEBP')
    } else if (result.status === 422) {
      message.show('Проверьте заполнение полей новости')
    } else {
      message.show('Не удалось сохранить новость')
    }
  } catch (error) {
    message.serverError()
  }
}

async function deleteNews(id) {
  message.clear()
  try {
    const result = await apiRequest(`/api/news/${id}`, 'DELETE')
    if (result.ok) {
      if (editingId.value === id) {
        resetNewsForm()
      }
      await loadNews()
    } else {
      message.show('Не удалось удалить новость')
    }
  } catch (error) {
    message.serverError()
  }
}

onMounted(() => {
  loadAnnouncements()
  loadNews()
})
</script>

<template>
  <!-- Управление оповещениями -->
  <section>
    <h2>Создать оповещение</h2>
    <form id="announcement-form" @submit.prevent="createAnnouncement">
      <label for="ann-title">Заголовок (до 120 символов)</label>
      <input id="ann-title" v-model="annTitle" type="text" maxlength="120" required />

      <label for="ann-text">Текст (до 2000 символов)</label>
      <textarea id="ann-text" v-model="annText" maxlength="2000" required></textarea>

      <button type="submit">Опубликовать оповещение</button>
    </form>
  </section>

  <section>
    <h2>Активные оповещения</h2>
    <p v-if="announcementsLoaded && announcements.length === 0">Оповещений пока нет</p>
    <div v-for="item in announcements" :key="item.id" class="admin-item">
      <div>
        <strong>{{ item.title }}</strong>
        <small> • {{ formatDate(item.created_at) }}</small>
        <p>{{ item.text }}</p>
      </div>
      <button type="button" @click="deleteAnnouncement(item.id)">Удалить</button>
    </div>
  </section>

  <!-- Управление новостями -->
  <section ref="newsFormSection">
    <h2>{{ editingId === null ? 'Создать новость' : `Редактирование новости #${editingId}` }}</h2>
    <form id="news-form" @submit.prevent="saveNews">
      <label for="news-title">Заголовок</label>
      <input id="news-title" v-model="newsTitle" type="text" maxlength="150" required />

      <label for="news-category">Категория</label>
      <input
        id="news-category"
        v-model="newsCategory"
        type="text"
        placeholder="Например: Обновления, Правила, Тест"
        maxlength="50"
        required
      />

      <label for="news-text">Текст новости</label>
      <textarea id="news-text" v-model="newsText" maxlength="20000" required></textarea>

      <label for="news-image">Картинка (необязательно)</label>
      <input
        id="news-image"
        ref="imageInput"
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp"
      />

      <label v-if="editingId !== null && editingHasImage" id="remove-image-label">
        <input v-model="removeImage" type="checkbox" /> Удалить текущую картинку
      </label>

      <div class="form-buttons">
        <button type="submit">{{ editingId === null ? 'Опубликовать новость' : 'Сохранить изменения' }}</button>
        <button v-if="editingId !== null" type="button" @click="cancelEdit">Отмена</button>
      </div>
    </form>
  </section>

  <section>
    <h2>Все новости</h2>
    <p v-if="newsLoaded && newsList.length === 0">Новостей пока нет</p>
    <div v-for="item in newsList" :key="item.id" class="admin-item">
      <div>
        <RouterLink :to="`/news/${item.id}`">{{ item.title }}</RouterLink>
        <br />
        <small>{{ item.category }} • {{ formatDate(item.created_at) }}</small>
      </div>
      <div class="admin-controls">
        <button type="button" @click="startEdit(item.id)">Редактировать</button>
        <button type="button" @click="deleteNews(item.id)">Удалить</button>
      </div>
    </div>
  </section>
</template>

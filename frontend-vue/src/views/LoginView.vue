<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { apiRequest } from '../api'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const auth = useAuthStore()

// ref — «живая» переменная: когда её значение меняется, Vue сам обновляет страницу.
// В скрипте значение читается и меняется через .value, в шаблоне .value не нужен.
const showRegister = ref(false) // false — показана форма входа, true — регистрации
const message = ref('') // текст ошибки

// Поля форм. Через v-model они связаны с <input>: что введено, то и лежит в переменной.
const loginUsername = ref('')
const loginPassword = ref('')
const registerUsername = ref('')
const registerDisplayName = ref('')
const registerPassword = ref('')

// Превращает ответ с ошибкой в понятный текст
function errorText(result) {
  if (result.status === 422) {
    return 'Проверьте введённые данные'
  }
  if (result.data && typeof result.data.detail === 'string') {
    return result.data.detail
  }
  return 'Что-то пошло не так'
}

// Общая логика для входа и регистрации
async function sendAuth(path, body) {
  message.value = ''
  try {
    const result = await apiRequest(path, 'POST', body)
    if (result.ok) {
      auth.setUser(result.data) // запоминаем пользователя в хранилище
      router.push({ name: 'feed' }) // переходим в ленту без перезагрузки страницы
    } else {
      message.value = errorText(result)
    }
  } catch (error) {
    message.value = 'Сервер недоступен. Проверьте, что бэкенд запущен.'
  }
}

function submitLogin() {
  sendAuth('/api/auth/login', {
    username: loginUsername.value.trim(),
    password: loginPassword.value,
  })
}

function submitRegister() {
  const body = {
    username: registerUsername.value.trim(),
    password: registerPassword.value,
  }
  // Имя необязательное: отправляем, только если оно заполнено
  const displayName = registerDisplayName.value.trim()
  if (displayName) {
    body.display_name = displayName
  }
  sendAuth('/api/auth/register', body)
}

// Переключение между формами входа и регистрации
function toggleForm() {
  showRegister.value = !showRegister.value
  message.value = ''
}
</script>

<template>
  <!-- Кнопка переключения форм -->
  <button type="button" id="toggle-button" @click="toggleForm">
    {{ showRegister ? 'Перейти ко входу' : 'Перейти к регистрации' }}
  </button>

  <!-- Форма входа. v-show прячет форму через стиль, но оставляет её на странице:
       стили страницы входа в main.css ищут #login-form -->
  <form id="login-form" v-show="!showRegister" @submit.prevent="submitLogin">
    <h3>Вход</h3>
    <input v-model="loginUsername" type="text" placeholder="Логин" required />
    <input v-model="loginPassword" type="password" placeholder="Пароль" required />
    <button type="submit">Войти</button>
  </form>

  <!-- Форма регистрации -->
  <form id="register-form" v-show="showRegister" @submit.prevent="submitRegister">
    <h3>Регистрация</h3>
    <input
      v-model="registerUsername"
      type="text"
      placeholder="Логин (латиница, цифры, _)"
      required
      minlength="3"
      maxlength="30"
      pattern="[A-Za-z0-9_]+"
    />
    <input
      v-model="registerDisplayName"
      type="text"
      placeholder="Имя (необязательно)"
      maxlength="50"
    />
    <input
      v-model="registerPassword"
      type="password"
      placeholder="Пароль (от 8 символов)"
      required
      minlength="8"
      maxlength="128"
    />
    <button type="submit">Зарегистрироваться</button>
  </form>

  <!-- Сообщения об ошибках -->
  <p id="message">{{ message }}</p>
</template>

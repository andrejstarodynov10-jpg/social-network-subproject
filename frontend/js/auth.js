// Адрес бэкенда. Меняется только здесь.
const API_URL = "http://localhost:8000";

// Находим элементы страницы по id из index.html
const loginForm = document.querySelector("#login-form");
const registerForm = document.querySelector("#register-form");
const toggleButton = document.querySelector("#toggle-button");
const messageBox = document.querySelector("#message");

// Показывает текст сообщения на странице (пустая строка очищает его)
function showMessage(text) {
    messageBox.textContent = text;
}

// Отправляет POST-запрос с JSON и возвращает { ok, status, data }
async function postJson(path, body) {
    const response = await fetch(`${API_URL}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // чтобы браузер сохранил cookie сессии
        body: JSON.stringify(body),
    });

    // Если сервер вернул не JSON, не ломаемся
    let data = null;
    try {
        data = await response.json();
    } catch (error) {
        data = null;
    }

    return { ok: response.ok, status: response.status, data: data };
}

// Превращает ответ с ошибкой в понятный текст
function errorText(result) {
    if (result.status === 422) {
        return "Проверьте введённые данные";
    }
    if (result.data && typeof result.data.detail === "string") {
        return result.data.detail;
    }
    return "Что-то пошло не так";
}

// Общая логика для входа и регистрации
async function sendAuth(path, body) {
    showMessage("");
    try {
        const result = await postJson(path, body);
        if (result.ok) {
            window.location.href = "feed.html"; // успех: переходим на ленту
        } else {
            showMessage(errorText(result));
        }
    } catch (error) {
        // fetch выбрасывает исключение, если сервер недоступен
        showMessage("Сервер недоступен. Проверьте, что бэкенд запущен.");
    }
}

// Отправка формы входа
loginForm.addEventListener("submit", (event) => {
    event.preventDefault(); // не даём странице перезагрузиться
    sendAuth("/api/auth/login", {
        username: document.querySelector("#login-username").value.trim(),
        password: document.querySelector("#login-password").value,
    });
});

// Отправка формы регистрации
registerForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const body = {
        username: document.querySelector("#register-username").value.trim(),
        password: document.querySelector("#register-password").value,
    };
    // Имя необязательное: отправляем, только если оно заполнено
    const displayName = document.querySelector("#register-display-name").value.trim();
    if (displayName) {
        body.display_name = displayName;
    }
    sendAuth("/api/auth/register", body);
});

// Переключение между формами входа и регистрации
toggleButton.addEventListener("click", () => {
    const showRegister = registerForm.hidden; // сейчас регистрация скрыта?
    registerForm.hidden = !showRegister;
    loginForm.hidden = showRegister;
    toggleButton.textContent = showRegister
        ? "Перейти ко входу"
        : "Перейти к регистрации";
    showMessage("");
});

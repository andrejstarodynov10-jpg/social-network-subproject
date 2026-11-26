// Находим элементы страницы по id из index.html
const loginForm = document.querySelector("#login-form");
const registerForm = document.querySelector("#register-form");
const toggleButton = document.querySelector("#toggle-button");

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
        const result = await apiRequest(path, "POST", body);
        if (result.ok) {
            window.location.href = "feed.html";
        } else {
            showMessage(errorText(result));
        }
    } catch (error) {
        showMessage("Сервер недоступен. Проверьте, что бэкенд запущен.");
    }
}

// Отправка формы входа
if (loginForm) {
    loginForm.addEventListener("submit", (event) => {
        event.preventDefault();
        sendAuth("/api/auth/login", {
            username: document.querySelector("#login-username").value.trim(),
            password: document.querySelector("#login-password").value,
        });
    });
}

// Отправка формы регистрации
if (registerForm) {
    registerForm.addEventListener("submit", (event) => {
        event.preventDefault();
        const body = {
            username: document.querySelector("#register-username").value.trim(),
            password: document.querySelector("#register-password").value,
        };
        const displayName = document.querySelector("#register-display-name").value.trim();
        if (displayName) {
            body.display_name = displayName;
        }
        sendAuth("/api/auth/register", body);
    });
}

// Переключение между формами входа и регистрации
if (toggleButton) {
    toggleButton.addEventListener("click", () => {
        const showRegister = registerForm.hidden;
        registerForm.hidden = !showRegister;
        loginForm.hidden = showRegister;
        toggleButton.textContent = showRegister
            ? "Перейти ко входу"
            : "Перейти к регистрации";
        showMessage("");
    });
}

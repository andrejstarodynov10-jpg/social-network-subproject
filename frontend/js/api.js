// Показывает текст сообщения на странице (пустая строка очищает его)
function showMessage(text) {
    const messageBox = document.querySelector("#message");
    if (messageBox) {
        messageBox.textContent = text;
    }
}

// Универсальная функция для запросов к API (GET, POST, DELETE и др.)
async function apiRequest(path, method = "GET", body = null) {
    const options = {
        method: method,
        credentials: "include",
    };

    if (body !== null) {
        options.headers = { "Content-Type": "application/json" };
        options.body = JSON.stringify(body);
    }

    const response = await fetch(`${API_URL}${path}`, options);

    let data = null;
    try {
        data = await response.json();
    } catch (error) {
        data = null;
    }

    return { ok: response.ok, status: response.status, data: data };
}

// Превращает дату в читаемый вид
function formatDate(isoString) {
    if (!isoString) return "";
    return new Date(isoString).toLocaleString("ru-RU");
}

// Проверяет, может ли пользователь удалить объект (пост или комментарий)
function canDelete(item, user) {
    if (!user || !item || !item.author) return false;
    return user.role === "admin" || item.author.id === user.id;
}

const displayNameBox = document.querySelector("#profile-display-name");
const usernameBox = document.querySelector("#profile-username");
const bioBox = document.querySelector("#profile-bio");

const editSection = document.querySelector("#edit-profile-section");
const editForm = document.querySelector("#edit-profile-form");
const editDisplayNameInput = document.querySelector("#edit-display-name");
const editBioInput = document.querySelector("#edit-bio");

const userPostsList = document.querySelector("#user-posts-list");

// Читаем id пользователя из адресной строки (?id=2)
const params = new URLSearchParams(window.location.search);
const profileId = Number(params.get("id"));

let currentUser = null;

// Отображает данные профиля на странице
function renderProfile(user) {
    displayNameBox.textContent = user.display_name || user.username;
    usernameBox.textContent = user.username;
    bioBox.textContent = user.bio || "Описание не заполнено";
    document.title = `${user.display_name || user.username} — Профиль`;
}

// Загружает информацию о пользователе (GET /api/users/{id}).
// Возвращает true, если профиль загружен, и false, если нет.
async function loadUserProfile(userId) {
    try {
        const result = await apiRequest(`/api/users/${userId}`);

        if (result.status === 404) {
            displayNameBox.textContent = "Пользователь не найден";
            return false;
        }

        if (result.ok && result.data) {
            const user = result.data;
            renderProfile(user);

            // Если открыт собственный профиль — показываем и заполняем форму редактирования
            if (currentUser && currentUser.id === user.id) {
                editSection.hidden = false;
                editDisplayNameInput.value = user.display_name || "";
                editBioInput.value = user.bio || "";
            } else {
                editSection.hidden = true;
            }
            return true;
        }

        showMessage("Не удалось загрузить профиль");
        return false;
    } catch (error) {
        showMessage("Сервер недоступен. Проверьте, что бэкенд запущен.");
        return false;
    }
}

// Загружает посты конкретного пользователя (GET /api/users/{id}/posts)
async function loadUserPosts(userId) {
    try {
        const result = await apiRequest(`/api/users/${userId}/posts`);

        if (!result.ok || !Array.isArray(result.data)) {
            showMessage("Не удалось загрузить посты пользователя");
            return;
        }

        userPostsList.innerHTML = "";

        if (result.data.length === 0) {
            const emptyText = document.createElement("p");
            emptyText.textContent = "У пользователя пока нет постов";
            userPostsList.append(emptyText);
            return;
        }

        for (const post of result.data) {
            userPostsList.append(createPostElement(post, currentUser));
        }
    } catch (error) {
        showMessage("Ошибка при загрузке постов");
    }
}

// Сохранение изменений профиля (PATCH /api/users/me)
if (editForm) {
    editForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        showMessage("");

        const displayName = editDisplayNameInput.value.trim();
        if (!displayName) {
            showMessage("Имя не может быть пустым");
            return;
        }

        // Пустое описание отправляем как пустую строку, чтобы сервер его очистил
        const body = {
            display_name: displayName,
            bio: editBioInput.value.trim(),
        };

        try {
            const result = await apiRequest("/api/users/me", "PATCH", body);

            if (result.ok && result.data) {
                currentUser = result.data;
                renderProfile(result.data);
                showMessage("Профиль обновлён");
                // Используем currentUser.id, чтобы работало даже при открытии profile.html без ?id=
                await loadUserPosts(currentUser.id);
            } else if (result.status === 422) {
                showMessage("Проверьте корректность введённых данных");
            } else {
                showMessage("Не удалось обновить профиль");
            }
        } catch (error) {
            showMessage("Сервер недоступен. Проверьте, что бэкенд запущен.");
        }
    });
}

// Инициализация страницы
async function initProfilePage() {
    try {
        const authResult = await apiRequest("/api/auth/me");

        if (authResult.status === 401) {
            window.location.href = "index.html";
            return;
        }

        if (authResult.ok && authResult.data) {
            currentUser = authResult.data;

            updateNavLinks(currentUser);

            // Если в URL не передан ?id=..., открываем профиль текущего пользователя
            const targetId = profileId || currentUser.id;
            if (!profileId) {
                window.history.replaceState(null, "", `profile.html?id=${targetId}`);
            }

            const profileLoaded = await loadUserProfile(targetId);
            if (profileLoaded) {
                await loadUserPosts(targetId);
            }
        } else {
            showMessage("Не удалось проверить авторизацию");
        }
    } catch (error) {
        showMessage("Сервер недоступен. Проверьте, что бэкенд запущен.");
    }
}

initProfilePage();

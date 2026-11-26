const myProfileLink = document.querySelector("#my-profile-link");
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

// Загружает информацию о пользователе (GET /api/users/{id})
async function loadUserProfile(userId) {
    try {
        const result = await apiRequest(`/api/users/${userId}`);

        if (result.status === 404) {
            displayNameBox.textContent = "Пользователь не найден";
            return;
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
        } else {
            showMessage("Не удалось загрузить профиль");
        }
    } catch (error) {
        showMessage("Сервер недоступен. Проверьте, что бэкенд запущен.");
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

        const body = {
            display_name: editDisplayNameInput.value.trim() || null,
            bio: editBioInput.value.trim() || null,
        };

        try {
            const result = await apiRequest("/api/users/me", "PATCH", body);

            if (result.ok && result.data) {
                currentUser = result.data;
                renderProfile(result.data);
                showMessage("Профиль обновлён");
                // Обновляем посты, чтобы в них отобразилось новое имя автора
                await loadUserPosts(profileId);
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

            if (myProfileLink) {
                myProfileLink.href = `profile.html?id=${currentUser.id}`;
            }

            // Если в URL не передан ?id=..., открываем профиль текущего пользователя
            const targetId = profileId || currentUser.id;
            if (!profileId) {
                window.history.replaceState(null, "", `profile.html?id=${targetId}`);
            }

            await loadUserProfile(targetId);
            await loadUserPosts(targetId);
        } else {
            showMessage("Не удалось проверить авторизацию");
        }
    } catch (error) {
        showMessage("Сервер недоступен. Проверьте, что бэкенд запущен.");
    }
}

initProfilePage();

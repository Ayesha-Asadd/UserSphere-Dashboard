document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const userList = document.getElementById('userList');
    const noUsersMessage = document.getElementById('noUsersMessage');
    const addUserBtn = document.getElementById('addUserBtn');
    const noUsersAddBtn = document.getElementById('noUsersAddBtn');
    const refreshBtn = document.getElementById('refreshBtn');
    const prevPageBtn = document.getElementById('prevPageBtn');
    const nextPageBtn = document.getElementById('nextPageBtn');
    const totalUsersCount = document.getElementById('totalUsersCount');
    const currentPageSpan = document.getElementById('currentPage');
    const totalPagesSpan = document.getElementById('totalPages');
    const perPageSpan = document.getElementById('perPage');
    const loadingSpinner = document.getElementById('loadingSpinner');
    const alertContainer = document.getElementById('alertContainer');
    
    // Search Elements
    const searchBtn = document.getElementById('searchBtn');
    const searchInput = document.getElementById('searchInput');

    // Modal Elements
    const userModal = document.getElementById('userModal');
    const modalTitle = document.getElementById('modalTitle');
    const userForm = document.getElementById('userForm');
    const userIdInput = document.getElementById('userId');
    const nameInput = document.getElementById('name');
    const jobInput = document.getElementById('job');
    const closeBtn = document.querySelector('.close-btn');

    // Delete Confirmation Modal Elements
    const deleteConfirmationModal = document.getElementById('deleteConfirmationModal');
    const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');

    // State Variables
    let currentPage = 1;
    let totalPages = 1;
    let usersCache = []; // in-memory cache for current session
    let userIdToDelete = null; // Stores the ID of the user to be deleted

    const API_URL = "https://reqres.in/api/users";
    const perPage = 6;

    /* ---------------- AJAX Helper ---------------- */
    function ajaxRequest(method, url, data = null, onSuccess, onError) {
        const xhr = new XMLHttpRequest();
        xhr.open(method, url, true);
        
        // Correct way to set headers: call setRequestHeader for each one
        xhr.setRequestHeader("x-api-key", "reqres-free-v1");
        xhr.setRequestHeader("Content-Type", "application/json");

        xhr.onloadstart = () => {
            loadingSpinner.style.display = "block";
        };
        xhr.onload = () => {
            loadingSpinner.style.display = "none";
            if (xhr.status >= 200 && xhr.status < 300) {
                onSuccess(xhr.responseText ? JSON.parse(xhr.responseText) : {});
            } else {
                onError(`Error ${xhr.status}: ${xhr.statusText}`);
            }
        };
        xhr.onerror = () => {
            loadingSpinner.style.display = "none";
            onError("Network error. Please check your connection.");
        };
        xhr.send(data ? JSON.stringify(data) : null);
    }

    /* ---------------- UI Helpers ---------------- */
    function showAlert(message, type) {
        alertContainer.innerHTML = `
            <div class="alert ${type}">
                <i class="fas fa-info-circle"></i>
                <span>${message}</span>
            </div>
        `;
        setTimeout(() => alertContainer.innerHTML = "", 4000);
    }

    function toggleNoUsersMessage(show) {
        noUsersMessage.style.display = show ? 'flex' : 'none';
        userList.style.display = show ? 'none' : 'grid';
    }

    function updatePaginationButtons() {
        prevPageBtn.disabled = currentPage === 1;
        nextPageBtn.disabled = currentPage >= totalPages;
    }

    function renderUsers(users) {
        userList.innerHTML = "";
        if (!users || users.length === 0) {
            toggleNoUsersMessage(true);
            return;
        }
        toggleNoUsersMessage(false);
        users.forEach(user => {
            const userCard = document.createElement("div");
            userCard.className = "user-card";
            userCard.innerHTML = `
                <img src="${user.avatar || 'https://via.placeholder.com/60'}" alt="${user.first_name}" class="user-avatar">
                <div class="user-info">
                    <h3>${user.first_name} ${user.last_name || ''}</h3>
                    <p>${user.email || ''}</p>
                    <small>${user.job || ''}</small>
                </div>
                <div class="user-actions">
                    <button class="user-action-btn edit-btn" data-id="${user.id}"><i class="fas fa-pen"></i></button>
                    <button class="user-action-btn delete-btn" data-id="${user.id}"><i class="fas fa-trash"></i></button>
                </div>
            `;
            userList.appendChild(userCard);
        });
    }

    // --- NEW FUNCTION TO RENDER USERS FROM CACHE WITH PAGINATION ---
    function renderPaginatedUsers() {
        const startIndex = (currentPage - 1) * perPage;
        const endIndex = startIndex + perPage;
        const usersToRender = usersCache.slice(startIndex, endIndex);

        renderUsers(usersToRender);
        totalPages = Math.ceil(usersCache.length / perPage);
        totalUsersCount.textContent = usersCache.length;
        currentPageSpan.textContent = currentPage;
        totalPagesSpan.textContent = totalPages;
        perPageSpan.textContent = perPage;
        updatePaginationButtons();
    }

    /* ---------------- CRUD with API ---------------- */
    function initializeUsers() {
        // Fetch all pages to build a complete user cache
        const fetchPage1 = new Promise((resolve, reject) => {
            ajaxRequest("GET", `${API_URL}?page=1`, null, (data) => resolve(data.data), reject);
        });
        const fetchPage2 = new Promise((resolve, reject) => {
            ajaxRequest("GET", `${API_URL}?page=2`, null, (data) => resolve(data.data), reject);
        });

        Promise.all([fetchPage1, fetchPage2])
            .then(results => {
                usersCache = [...results[0], ...results[1]];
                currentPage = 1;
                renderPaginatedUsers();
            })
            .catch(err => {
                showAlert(err, 'error');
                toggleNoUsersMessage(true);
            });
    }

    function addUser(name, job, avatarUrl) {
        ajaxRequest("POST", API_URL, { name, job, avatar: avatarUrl }, (response) => {
            const newUser = {
                id: response.id || Date.now(),
                first_name: name,
                last_name: '',
                email: `${name.toLowerCase().replace(/\s/g, '')}@reqres.in`,
                avatar: avatarUrl || 'https://via.placeholder.com/60',
                job
            };
            usersCache.unshift(newUser);
            currentPage = 1; // Go to the first page to show the new user
            renderPaginatedUsers();
            showAlert(`User '${name}' added successfully!`, 'success');
        }, (err) => showAlert(err, 'error'));
    }

    function editUser(id, name, job, avatarUrl) {
        ajaxRequest("PUT", `${API_URL}/${id}`, { name, job, avatar: avatarUrl }, () => {
            const idx = usersCache.findIndex(u => u.id == id);
            if (idx !== -1) {
                usersCache[idx].first_name = name;
                usersCache[idx].job = job;
                usersCache[idx].avatar = avatarUrl;
            }
            renderPaginatedUsers();
            showAlert(`User with ID ${id} updated successfully!`, 'success');
        }, (err) => showAlert(err, 'error'));
    }

    function deleteUser(id) {
        ajaxRequest("DELETE", `${API_URL}/${id}`, null, () => {
            usersCache = usersCache.filter(u => u.id != id);
            // If the current page is empty after deleting the last user, move to the previous page
            if (usersCache.length > 0 && currentPage > 1 && usersCache.slice((currentPage-1)*perPage, currentPage*perPage).length === 0) {
                currentPage--;
            }
            renderPaginatedUsers();
            showAlert(`User with ID ${id} deleted successfully!`, 'success');
        }, (err) => showAlert(err, 'error'));
    }

    /* ---------------- Modal Handlers ---------------- */
    function openModal(mode, user = null) {
        userModal.style.display = "flex";
        if (mode === "add") {
            modalTitle.textContent = "Add New User";
            userForm.reset();
            userIdInput.value = "";
        } else if (mode === "edit" && user) {
            modalTitle.textContent = "Edit User";
            userIdInput.value = user.id;
            nameInput.value = user.first_name;
            jobInput.value = user.job || "";
        }
    }
    function closeModal() {
        userModal.style.display = "none";
    }
    addUserBtn.addEventListener('click', () => openModal('add'));
    noUsersAddBtn.addEventListener('click', () => openModal('add'));
    closeBtn.addEventListener('click', closeModal);

    userForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = nameInput.value.trim();
        const job = jobInput.value.trim();
        const avatarUrl = document.getElementById("avatar").value.trim();
        const id = userIdInput.value;
        closeModal();
        if (id) {
            editUser(id, name, job, avatarUrl);
        } else {
            addUser(name, job, avatarUrl);
        }
    });

    userList.addEventListener('click', (e) => {
        if (e.target.closest('.delete-btn')) {
            userIdToDelete = e.target.closest('.delete-btn').dataset.id;
            deleteConfirmationModal.style.display = 'flex';
        }
        if (e.target.closest('.edit-btn')) {
            const id = e.target.closest('.edit-btn').dataset.id;
            const user = usersCache.find(u => u.id == id);
            if (user) openModal('edit', user);
        }
    });

    // Delete Confirmation Modal Listeners
    cancelDeleteBtn.addEventListener('click', () => {
        deleteConfirmationModal.style.display = 'none';
        userIdToDelete = null;
    });

    confirmDeleteBtn.addEventListener('click', () => {
        if (userIdToDelete) {
            deleteUser(userIdToDelete);
            deleteConfirmationModal.style.display = 'none';
            userIdToDelete = null;
        }
    });

    prevPageBtn.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            renderPaginatedUsers();
        }
    });
    nextPageBtn.addEventListener('click', () => {
        if (currentPage < totalPages) {
            currentPage++;
            renderPaginatedUsers();
        }
    });

    // Search Event Listeners
    searchBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isVisible = searchInput.style.display === 'block';
        searchInput.style.display = isVisible ? 'none' : 'block';
        if (isVisible) {
            searchInput.value = '';
            renderPaginatedUsers();
        }
    });

    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase().trim();
        if (searchTerm === '') {
            renderPaginatedUsers();
            return;
        }
        const filteredUsers = usersCache.filter(user =>
            user.first_name.toLowerCase().includes(searchTerm) ||
            user.email.toLowerCase().includes(searchTerm)
        );
        renderUsers(filteredUsers);
    });

    document.addEventListener('click', (e) => {
        if (
            searchInput.style.display === 'block' &&
            !searchBtn.contains(e.target) &&
            !searchInput.contains(e.target)
        ) {
            searchInput.style.display = 'none';
            searchInput.value = '';
            renderPaginatedUsers();
        }
    });

    /* ---------------- Initial Load ---------------- */
    initializeUsers();
});
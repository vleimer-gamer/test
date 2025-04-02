document.addEventListener('DOMContentLoaded', function() {
    // Элементы интерфейса
    const authContainer = document.getElementById('auth-container');
    const messengerContainer = document.getElementById('messenger-container');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const showRegister = document.getElementById('show-register');
    const showLogin = document.getElementById('show-login');
    const loginBtn = document.getElementById('login-btn');
    const registerBtn = document.getElementById('register-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const currentUsername = document.getElementById('current-username');
    const chatList = document.getElementById('chat-list');
    const chatPlaceholder = document.getElementById('chat-placeholder');
    const activeChat = document.getElementById('active-chat');
    const messagesContainer = document.getElementById('messages-container');
    const messageInput = document.getElementById('message-input');
    const sendBtn = document.getElementById('send-btn');
    const newChatBtn = document.getElementById('new-chat-btn');
    const createChatBtn = document.getElementById('create-chat-btn');
    const newChatModal = document.getElementById('new-chat-modal');
    const closeNewChatModal = document.getElementById('close-new-chat-modal');
    const createPrivateChat = document.getElementById('create-private-chat');
    const createGroupChat = document.getElementById('create-group-chat');

    // WebSocket соединение
    let socket = null;
    let currentUser = null;
    let activeChatId = null;

    // Инициализация WebSocket
    function initWebSocket() {
        socket = new WebSocket('ws://localhost:3000');

        socket.onopen = function() {
            console.log('WebSocket connected');
        };

        socket.onmessage = function(event) {
            const data = JSON.parse(event.data);
            console.log('WebSocket message:', data);

            if (data.type === 'new_message' && data.data.chat_id === activeChatId) {
                addMessageToChat(data.data);
            }
        };

        socket.onclose = function() {
            console.log('WebSocket disconnected');
            // Пытаемся переподключиться через 5 секунд
            setTimeout(initWebSocket, 5000);
        };
    }

    // Переключение между формами входа и регистрации
    showRegister.addEventListener('click', function() {
        loginForm.classList.add('hidden');
        registerForm.classList.remove('hidden');
        registerForm.style.animation = 'slideInUp 0.5s ease-in-out';
    });

    showLogin.addEventListener('click', function() {
        registerForm.classList.add('hidden');
        loginForm.classList.remove('hidden');
        loginForm.style.animation = 'slideInUp 0.5s ease-in-out';
    });

    // Регистрация нового пользователя
    registerBtn.addEventListener('click', async function() {
        const username = document.getElementById('register-username').value.trim();
        const password = document.getElementById('register-password').value;
        const confirm = document.getElementById('register-confirm').value;

        if (!username || !password || !confirm) {
            showAlert('Пожалуйста, заполните все поля', 'error');
            return;
        }

        if (password !== confirm) {
            showAlert('Пароли не совпадают', 'error');
            return;
        }

        try {
            const response = await fetch('http://localhost:3000/api/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (response.ok) {
                showAlert('Регистрация прошла успешно! Теперь вы можете войти.', 'success');
                showLogin.click();

                // Очищаем поля формы
                document.getElementById('register-username').value = '';
                document.getElementById('register-password').value = '';
                document.getElementById('register-confirm').value = '';
            } else {
                showAlert(data.error || 'Ошибка регистрации', 'error');
            }
        } catch (error) {
            showAlert('Ошибка соединения с сервером', 'error');
            console.error('Registration error:', error);
        }
    });

    // Вход пользователя
    loginBtn.addEventListener('click', async function() {
        const username = document.getElementById('login-username').value.trim();
        const password = document.getElementById('login-password').value;

        try {
            const response = await fetch('http://localhost:3000/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (response.ok) {
                currentUser = data;
                localStorage.setItem('messenger_current_user', JSON.stringify(currentUser));

                // Очищаем поля формы
                document.getElementById('login-username').value = '';
                document.getElementById('login-password').value = '';

                // Показываем интерфейс мессенджера
                authContainer.classList.add('hidden');
                messengerContainer.classList.remove('hidden');

                // Обновляем информацию о пользователе
                currentUsername.textContent = currentUser.username;

                // Инициализируем WebSocket
                initWebSocket();

                // Загружаем чаты
                loadChats();
            } else {
                showAlert(data.error || 'Неверное имя пользователя или пароль', 'error');
            }
        } catch (error) {
            showAlert('Ошибка соединения с сервером', 'error');
            console.error('Login error:', error);
        }
    });

    // Выход пользователя
    logoutBtn.addEventListener('click', function() {
        currentUser = null;
        localStorage.removeItem('messenger_current_user');

        if (socket) {
            socket.close();
        }

        messengerContainer.classList.add('hidden');
        authContainer.classList.remove('hidden');
        loginForm.classList.remove('hidden');
        registerForm.classList.add('hidden');
    });

    // Проверяем, есть ли авторизованный пользователь
    async function checkAuth() {
        const storedUser = localStorage.getItem('messenger_current_user');
        if (storedUser) {
            currentUser = JSON.parse(storedUser);

            try {
                // Проверяем валидность токена (в реальном приложении)
                authContainer.classList.add('hidden');
                messengerContainer.classList.remove('hidden');
                currentUsername.textContent = currentUser.username;

                // Инициализируем WebSocket
                initWebSocket();

                // Загружаем чаты
                loadChats();
            } catch (error) {
                localStorage.removeItem('messenger_current_user');
                authContainer.classList.remove('hidden');
                messengerContainer.classList.add('hidden');
            }
        }
    }

    checkAuth();

    // Загрузка чатов пользователя
    async function loadChats() {
        try {
            const response = await fetch(`http://localhost:3000/api/chats?userId=${currentUser.id}`);
            const chats = await response.json();

            chatList.innerHTML = '';

            if (chats.length === 0) {
                chatList.innerHTML = '<p class="no-chats">У вас пока нет чатов</p>';
                return;
            }

            chats.forEach(chat => {
                const chatItem = document.createElement('div');
                chatItem.className = 'chat-item';
                chatItem.setAttribute('data-chat-id', chat.id);

                if (chat.id === activeChatId) {
                    chatItem.classList.add('active');
                }

                // Определяем аватар и название чата
                let chatName = chat.name;
                let avatar = 'https://via.placeholder.com/40';

                if (chat.type === 'private') {
                    // В реальном приложении нужно получить данные собеседника
                    const otherUser = chat.name.replace(`${currentUser.username} и `, '');
                    chatName = otherUser;
                    avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(otherUser)}&background=5865F2&color=fff`;
                } else {
                    avatar = 'https://via.placeholder.com/40/5865F2/fff?text=G';
                }

                // Формируем последнее сообщение
                let lastMessage = 'Нет сообщений';
                let lastMessageTime = '';

                if (chat.lastMessage) {
                    lastMessage = chat.lastMessage.text.length > 30
                        ? chat.lastMessage.text.substring(0, 30) + '...'
                        : chat.lastMessage.text;

                    lastMessageTime = formatTime(chat.lastMessage.created_at);
                }

                chatItem.innerHTML = `
                    <img src="${avatar}" alt="${chatName}">
                    <div class="chat-info">
                        <div class="chat-name">${chatName}</div>
                        <div class="chat-last-message">${lastMessage}</div>
                    </div>
                    <div class="chat-time">${lastMessageTime}</div>
                `;

                chatItem.addEventListener('click', function() {
                    openChat(chat.id);
                });

                chatList.appendChild(chatItem);
            });
        } catch (error) {
            console.error('Error loading chats:', error);
            showAlert('Ошибка загрузки чатов', 'error');
        }
    }

    // Открытие чата
    async function openChat(chatId) {
        activeChatId = chatId;

        // Обновляем активный чат в списке
        document.querySelectorAll('.chat-item').forEach(item => {
            item.classList.remove('active');
            if (item.getAttribute('data-chat-id') === chatId) {
                item.classList.add('active');
            }
        });

        try {
            // Получаем информацию о чате
            const response = await fetch(`http://localhost:3000/api/messages?chatId=${chatId}`);
            const messages = await response.json();

            // Устанавливаем заголовок чата
            const activeChatItem = document.querySelector(`.chat-item[data-chat-id="${chatId}"]`);
            let chatTitle = activeChatItem ? activeChatItem.querySelector('.chat-name').textContent : 'Чат';

            document.getElementById('chat-title').textContent = chatTitle;
            document.querySelector('.chat-img').src = activeChatItem ? activeChatItem.querySelector('img').src : 'https://via.placeholder.com/40';

            // Загружаем сообщения
            loadMessages(messages);

            // Показываем активный чат
            chatPlaceholder.classList.add('hidden');
            activeChat.classList.remove('hidden');
        } catch (error) {
            console.error('Error opening chat:', error);
            showAlert('Ошибка загрузки чата', 'error');
        }
    }

    // Загрузка сообщений
    function loadMessages(messages) {
        messagesContainer.innerHTML = '';

        messages.forEach(msg => {
            addMessageToChat(msg);
        });

        // Прокручиваем вниз
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    // Добавление сообщения в чат
    function addMessageToChat(message) {
        if (message.chat_id !== activeChatId) return;

        const messageElement = document.createElement('div');
        messageElement.className = 'message';

        messageElement.innerHTML = `
            <img src="${message.avatar || 'https://via.placeholder.com/40'}" alt="${message.username}" class="message-avatar">
            <div class="message-content">
                <div class="message-header">
                    <span class="message-sender">${message.username}</span>
                    <span class="message-time">${formatTime(message.created_at)}</span>
                </div>
                <div class="message-text">${message.text}</div>
            </div>
        `;

        messagesContainer.appendChild(messageElement);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    // Отправка сообщения
    async function sendMessage() {
        const text = messageInput.value.trim();
        if (!text || !activeChatId) return;

        try {
            const response = await fetch('http://localhost:3000/api/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    chatId: activeChatId,
                    senderId: currentUser.id,
                    text
                })
            });

            if (response.ok) {
                messageInput.value = '';
            } else {
                const error = await response.json();
                showAlert(error.error || 'Ошибка отправки сообщения', 'error');
            }
        } catch (error) {
            console.error('Error sending message:', error);
            showAlert('Ошибка отправки сообщения', 'error');
        }
    }

    // Обработчики отправки сообщения
    sendBtn.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });

    // Создание нового чата
    newChatBtn.addEventListener('click', function() {
        newChatModal.classList.remove('hidden');
    });

    createChatBtn.addEventListener('click', function() {
        newChatModal.classList.remove('hidden');
    });

    closeNewChatModal.addEventListener('click', function() {
        newChatModal.classList.add('hidden');
    });

    // Переключение между вкладками в модальном окне
    document.querySelectorAll('.modal-tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const tab = this.getAttribute('data-tab');

            // Убираем активный класс у всех кнопок и контента
            document.querySelectorAll('.modal-tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.modal-tab-content').forEach(c => c.classList.remove('active'));

            // Добавляем активный класс текущей кнопке и соответствующему контенту
            this.classList.add('active');
            document.getElementById(`${tab}-tab`).classList.add('active');
        });
    });

    // Создание приватного чата
    createPrivateChat.addEventListener('click', async function() {
        const username = document.getElementById('private-chat-name').value.trim();

        if (!username) {
            showAlert('Введите имя пользователя', 'error');
            return;
        }

        try {
            // Находим пользователя по имени
            const response = await fetch(`http://localhost:3000/api/users?username=${username}`);
            const user = await response.json();

            if (!user) {
                showAlert('Пользователь не найден', 'error');
                return;
            }

            if (user.id === currentUser.id) {
                showAlert('Нельзя создать чат с самим собой', 'error');
                return;
            }

            // Создаем чат
            const chatResponse = await fetch('http://localhost:3000/api/chats', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    type: 'private',
                    name: `${currentUser.username} и ${user.username}`,
                    creatorId: currentUser.id,
                    members: [user.id]
                })
            });

            const chat = await chatResponse.json();

            if (chatResponse.ok) {
                // Обновляем список чатов и открываем новый чат
                loadChats();
                openChat(chat.id);
                newChatModal.classList.add('hidden');
                document.getElementById('private-chat-name').value = '';
            } else {
                showAlert(chat.error || 'Ошибка создания чата', 'error');
            }
        } catch (error) {
            console.error('Error creating private chat:', error);
            showAlert('Ошибка создания чата', 'error');
        }
    });

    // Создание группового чата
    createGroupChat.addEventListener('click', async function() {
        const groupName = document.getElementById('group-chat-name').value.trim();
        const membersInput = document.getElementById('group-members').value.trim();

        if (!groupName) {
            showAlert('Введите название группы', 'error');
            return;
        }

        if (!membersInput) {
            showAlert('Добавьте участников группы', 'error');
            return;
        }

        const usernames = membersInput.split(',').map(u => u.trim()).filter(u => u);
        const memberIds = [];

        try {
            // Находим ID всех участников
            for (const username of usernames) {
                const response = await fetch(`http://localhost:3000/api/users?username=${username}`);
                const user = await response.json();

                if (!user) {
                    showAlert(`Пользователь "${username}" не найден`, 'error');
                    return;
                }

                if (user.id !== currentUser.id) {
                    memberIds.push(user.id);
                }
            }

            if (memberIds.length === 0) {
                showAlert('Добавьте хотя бы одного участника', 'error');
                return;
            }

            // Создаем групповой чат
            const chatResponse = await fetch('http://localhost:3000/api/chats', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    type: 'group',
                    name: groupName,
                    creatorId: currentUser.id,
                    members: memberIds
                })
            });

            const chat = await chatResponse.json();

            if (chatResponse.ok) {
                // Обновляем список чатов и открываем новый чат
                loadChats();
                openChat(chat.id);
                newChatModal.classList.add('hidden');
                document.getElementById('group-chat-name').value = '';
                document.getElementById('group-members').value = '';
            } else {
                showAlert(chat.error || 'Ошибка создания чата', 'error');
            }
        } catch (error) {
            console.error('Error creating group chat:', error);
            showAlert('Ошибка создания чата', 'error');
        }
    });

    // Форматирование времени
    function formatTime(isoString) {
        if (!isoString) return '';

        const date = new Date(isoString);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    // Показ уведомлений
    function showAlert(message, type = 'info') {
        const alert = document.createElement('div');
        alert.className = `alert alert-${type}`;
        alert.textContent = message;

        document.body.appendChild(alert);

        setTimeout(() => {
            alert.classList.add('fade-out');
            setTimeout(() => alert.remove(), 500);
        }, 3000);
    }
});
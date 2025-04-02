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

    // Данные приложения
    let users = JSON.parse(localStorage.getItem('messenger_users')) || [];
    let currentUser = null;
    let chats = JSON.parse(localStorage.getItem('messenger_chats')) || [];
    let activeChatId = null;

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
    registerBtn.addEventListener('click', function() {
        const username = document.getElementById('register-username').value.trim();
        const password = document.getElementById('register-password').value;
        const confirm = document.getElementById('register-confirm').value;

        if (!username || !password || !confirm) {
            alert('Пожалуйста, заполните все поля');
            return;
        }

        if (password !== confirm) {
            alert('Пароли не совпадают');
            return;
        }

        if (users.some(user => user.username === username)) {
            alert('Пользователь с таким именем уже существует');
            return;
        }

        const newUser = {
            id: Date.now().toString(),
            username,
            password,
            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=5865F2&color=fff`
        };

        users.push(newUser);
        localStorage.setItem('messenger_users', JSON.stringify(users));

        alert('Регистрация прошла успешно! Теперь вы можете войти.');
        showLogin.click();

        // Очищаем поля формы
        document.getElementById('register-username').value = '';
        document.getElementById('register-password').value = '';
        document.getElementById('register-confirm').value = '';
    });

    // Вход пользователя
    loginBtn.addEventListener('click', function() {
        const username = document.getElementById('login-username').value.trim();
        const password = document.getElementById('login-password').value;

        const user = users.find(u => u.username === username && u.password === password);

        if (!user) {
            alert('Неверное имя пользователя или пароль');
            return;
        }

        currentUser = user;
        localStorage.setItem('messenger_current_user', JSON.stringify(user));

        // Очищаем поля формы
        document.getElementById('login-username').value = '';
        document.getElementById('login-password').value = '';

        // Показываем интерфейс мессенджера
        authContainer.classList.add('hidden');
        messengerContainer.classList.remove('hidden');

        // Обновляем информацию о пользователе
        currentUsername.textContent = currentUser.username;

        // Загружаем чаты
        loadChats();
    });

    // Выход пользователя
    logoutBtn.addEventListener('click', function() {
        currentUser = null;
        localStorage.removeItem('messenger_current_user');

        messengerContainer.classList.add('hidden');
        authContainer.classList.remove('hidden');
        loginForm.classList.remove('hidden');
        registerForm.classList.add('hidden');
    });

    // Проверяем, есть ли авторизованный пользователь
    function checkAuth() {
        const storedUser = localStorage.getItem('messenger_current_user');
        if (storedUser) {
            currentUser = JSON.parse(storedUser);
            authContainer.classList.add('hidden');
            messengerContainer.classList.remove('hidden');
            currentUsername.textContent = currentUser.username;
            loadChats();
        }
    }

    checkAuth();

    // Загрузка чатов пользователя
    function loadChats() {
        chatList.innerHTML = '';

        const userChats = chats.filter(chat =>
            chat.members.includes(currentUser.id) || chat.creator === currentUser.id
        );

        if (userChats.length === 0) {
            chatList.innerHTML = '<p class="no-chats">У вас пока нет чатов</p>';
            return;
        }

        userChats.forEach(chat => {
            const chatItem = document.createElement('div');
            chatItem.className = 'chat-item';
            if (chat.id === activeChatId) {
                chatItem.classList.add('active');
            }

            // Для приватных чатов находим собеседника
            let chatName = chat.name;
            let avatar = 'https://via.placeholder.com/40';

            if (chat.type === 'private') {
                const otherMemberId = chat.members.find(member => member !== currentUser.id);
                if (otherMemberId) {
                    const otherUser = users.find(u => u.id === otherMemberId);
                    if (otherUser) {
                        chatName = otherUser.username;
                        avatar = otherUser.avatar;
                    }
                }
            } else {
                // Для групповых чатов можно использовать иконку группы
                avatar = 'https://via.placeholder.com/40/5865F2/fff?text=G';
            }

            chatItem.innerHTML = `
                <img src="${avatar}" alt="${chatName}">
                <div class="chat-info">
                    <div class="chat-name">${chatName}</div>
                    <div class="chat-last-message">${chat.lastMessage || 'Нет сообщений'}</div>
                </div>
                <div class="chat-time">${formatTime(chat.lastMessageTime)}</div>
            `;

            chatItem.addEventListener('click', function() {
                openChat(chat.id);
            });

            chatList.appendChild(chatItem);
        });
    }

    // Открытие чата
    function openChat(chatId) {
        activeChatId = chatId;
        const chat = chats.find(c => c.id === chatId);

        if (!chat) return;

        // Обновляем активный чат в списке
        document.querySelectorAll('.chat-item').forEach(item => {
            item.classList.remove('active');
        });

        const activeChatItem = Array.from(document.querySelectorAll('.chat-item')).find(item => {
            return item.getAttribute('data-chat-id') === chatId;
        });

        if (activeChatItem) {
            activeChatItem.classList.add('active');
        }

        // Устанавливаем заголовок чата
        let chatTitle = chat.name;
        let avatar = 'https://via.placeholder.com/40';

        if (chat.type === 'private') {
            const otherMemberId = chat.members.find(member => member !== currentUser.id);
            if (otherMemberId) {
                const otherUser = users.find(u => u.id === otherMemberId);
                if (otherUser) {
                    chatTitle = otherUser.username;
                    avatar = otherUser.avatar;
                }
            }
        } else {
            avatar = 'https://via.placeholder.com/40/5865F2/fff?text=G';
        }

        document.getElementById('chat-title').textContent = chatTitle;
        document.querySelector('.chat-img').src = avatar;

        // Загружаем сообщения
        loadMessages(chatId);

        // Показываем активный чат
        chatPlaceholder.classList.add('hidden');
        activeChat.classList.remove('hidden');
    }

    // Загрузка сообщений
    function loadMessages(chatId) {
        messagesContainer.innerHTML = '';

        const chat = chats.find(c => c.id === chatId);
        if (!chat || !chat.messages) return;

        chat.messages.forEach(msg => {
            const sender = users.find(u => u.id === msg.senderId);
            if (!sender) return;

            const messageElement = document.createElement('div');
            messageElement.className = 'message';

            messageElement.innerHTML = `
                <img src="${sender.avatar}" alt="${sender.username}" class="message-avatar">
                <div class="message-content">
                    <div class="message-header">
                        <span class="message-sender">${sender.username}</span>
                        <span class="message-time">${formatTime(msg.time)}</span>
                    </div>
                    <div class="message-text">${msg.text}</div>
                </div>
            `;

            messagesContainer.appendChild(messageElement);
        });

        // Прокручиваем вниз
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    // Отправка сообщения
    function sendMessage() {
        const text = messageInput.value.trim();
        if (!text || !activeChatId) return;

        const chatIndex = chats.findIndex(c => c.id === activeChatId);
        if (chatIndex === -1) return;

        const newMessage = {
            id: Date.now().toString(),
            senderId: currentUser.id,
            text,
            time: new Date().toISOString()
        };

        if (!chats[chatIndex].messages) {
            chats[chatIndex].messages = [];
        }

        chats[chatIndex].messages.push(newMessage);
        chats[chatIndex].lastMessage = text.length > 30 ? text.substring(0, 30) + '...' : text;
        chats[chatIndex].lastMessageTime = newMessage.time;

        localStorage.setItem('messenger_chats', JSON.stringify(chats));

        // Обновляем интерфейс
        loadMessages(activeChatId);
        loadChats();

        // Очищаем поле ввода
        messageInput.value = '';
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
    createPrivateChat.addEventListener('click', function() {
        const username = document.getElementById('private-chat-name').value.trim();

        if (!username) {
            alert('Введите имя пользователя');
            return;
        }

        const user = users.find(u => u.username === username);
        if (!user) {
            alert('Пользователь не найден');
            return;
        }

        if (user.id === currentUser.id) {
            alert('Нельзя создать чат с самим собой');
            return;
        }

        // Проверяем, нет ли уже такого чата
        const existingChat = chats.find(chat =>
            chat.type === 'private' &&
            chat.members.includes(currentUser.id) &&
            chat.members.includes(user.id)
        );

        if (existingChat) {
            alert('Чат с этим пользователем уже существует');
            openChat(existingChat.id);
            newChatModal.classList.add('hidden');
            return;
        }

        const newChat = {
            id: Date.now().toString(),
            type: 'private',
            name: `${currentUser.username} и ${user.username}`,
            creator: currentUser.id,
            members: [currentUser.id, user.id],
            messages: [],
            createdAt: new Date().toISOString()
        };

        chats.push(newChat);
        localStorage.setItem('messenger_chats', JSON.stringify(chats));

        // Обновляем список чатов и открываем новый чат
        loadChats();
        openChat(newChat.id);
        newChatModal.classList.add('hidden');
        document.getElementById('private-chat-name').value = '';
    });

    // Создание группового чата
    createGroupChat.addEventListener('click', function() {
        const groupName = document.getElementById('group-chat-name').value.trim();
        const membersInput = document.getElementById('group-members').value.trim();

        if (!groupName) {
            alert('Введите название группы');
            return;
        }

        if (!membersInput) {
            alert('Добавьте участников группы');
            return;
        }

        const usernames = membersInput.split(',').map(u => u.trim()).filter(u => u);
        const memberIds = [];

        for (const username of usernames) {
            const user = users.find(u => u.username === username);
            if (!user) {
                alert(`Пользователь "${username}" не найден`);
                return;
            }

            if (user.id === currentUser.id) {
                continue; // Пропускаем себя
            }

            memberIds.push(user.id);
        }

        if (memberIds.length === 0) {
            alert('Добавьте хотя бы одного участника');
            return;
        }

        const newChat = {
            id: Date.now().toString(),
            type: 'group',
            name: groupName,
            creator: currentUser.id,
            members: [currentUser.id, ...memberIds],
            messages: [],
            createdAt: new Date().toISOString()
        };

        chats.push(newChat);
        localStorage.setItem('messenger_chats', JSON.stringify(chats));

        // Обновляем список чатов и открываем новый чат
        loadChats();
        openChat(newChat.id);
        newChatModal.classList.add('hidden');
        document.getElementById('group-chat-name').value = '';
        document.getElementById('group-members').value = '';
    });

    // Форматирование времени
    function formatTime(isoString) {
        if (!isoString) return '';

        const date = new Date(isoString);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    // Демо данные (для тестирования)
    function initDemoData() {
        if (users.length === 0 && chats.length === 0) {
            // Создаем демо пользователей
            const demoUsers = [
                { id: '1', username: 'Алексей', password: '123', avatar: 'https://ui-avatars.com/api/?name=Алексей&background=5865F2&color=fff' },
                { id: '2', username: 'Мария', password: '123', avatar: 'https://ui-avatars.com/api/?name=Мария&background=ED4245&color=fff' },
                { id: '3', username: 'Иван', password: '123', avatar: 'https://ui-avatars.com/api/?name=Иван&background=3BA55C&color=fff' }
            ];

            users = demoUsers;
            localStorage.setItem('messenger_users', JSON.stringify(users));

            // Создаем демо чаты
            const demoChats = [
                {
                    id: '1',
                    type: 'private',
                    name: 'Алексей и Мария',
                    creator: '1',
                    members: ['1', '2'],
                    messages: [
                        { id: '1', senderId: '1', text: 'Привет, Мария!', time: new Date(Date.now() - 3600000).toISOString() },
                        { id: '2', senderId: '2', text: 'Привет, Алексей! Как дела?', time: new Date(Date.now() - 3500000).toISOString() },
                        { id: '3', senderId: '1', text: 'Отлично, спасибо! А у тебя?', time: new Date(Date.now() - 3400000).toISOString() }
                    ],
                    lastMessage: 'Отлично, спасибо! А у тебя?',
                    lastMessageTime: new Date(Date.now() - 3400000).toISOString(),
                    createdAt: new Date(Date.now() - 86400000).toISOString()
                },
                {
                    id: '2',
                    type: 'group',
                    name: 'Рабочая группа',
                    creator: '1',
                    members: ['1', '2', '3'],
                    messages: [
                        { id: '1', senderId: '1', text: 'Доброе утро, команда!', time: new Date(Date.now() - 7200000).toISOString() },
                        { id: '2', senderId: '3', text: 'Доброе! Какие планы на сегодня?', time: new Date(Date.now() - 7100000).toISOString() },
                        { id: '3', senderId: '2', text: 'Я сегодня работаю над новым дизайном', time: new Date(Date.now() - 7000000).toISOString() }
                    ],
                    lastMessage: 'Я сегодня работаю над новым дизайном',
                    lastMessageTime: new Date(Date.now() - 7000000).toISOString(),
                    createdAt: new Date(Date.now() - 172800000).toISOString()
                }
            ];

            chats = demoChats;
            localStorage.setItem('messenger_chats', JSON.stringify(chats));
        }
    }

    // Инициализация демо данных (можно удалить в продакшене)
    initDemoData();
});
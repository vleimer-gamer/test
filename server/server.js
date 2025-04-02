const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const path = require('path');
const cors = require('cors');
const {
  createUser,
  findUserByUsername,
  createChat,
  addChatMember,
  getUserChats,
  createMessage,
  getChatMessages
} = require('./database');
const bcrypt = require('bcryptjs');
const uuid = require('uuid');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../client')));

// API Routes
app.post('/api/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const existingUser = await new Promise((resolve) => {
      findUserByUsername(username, (err, user) => resolve(user));
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    const user = await new Promise((resolve) => {
      createUser(username, password, (err, user) => resolve(user));
    });

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const user = await new Promise((resolve) => {
      findUserByUsername(username, (err, user) => resolve(user));
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    res.json({ id: user.id, username: user.username, avatar: user.avatar });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/chats', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const chats = await new Promise((resolve) => {
      getUserChats(userId, (err, chats) => resolve(chats || []));
    });

    // Для каждого чата получаем последнее сообщение
    for (const chat of chats) {
      const messages = await new Promise((resolve) => {
        getChatMessages(chat.id, (err, messages) => resolve(messages || []));
      });
      chat.lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
    }

    res.json(chats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/messages', async (req, res) => {
  try {
    const { chatId } = req.query;
    if (!chatId) {
      return res.status(400).json({ error: 'Chat ID is required' });
    }

    const messages = await new Promise((resolve) => {
      getChatMessages(chatId, (err, messages) => resolve(messages || []));
    });

    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/chats', async (req, res) => {
  try {
    const { type, name, creatorId, members } = req.body;
    if (!type || !creatorId || !members || members.length === 0) {
      return res.status(400).json({ error: 'Invalid chat data' });
    }

    const chatId = uuid.v4();
    const chatData = { id: chatId, name, type, creatorId };

    await new Promise((resolve) => {
      createChat(chatData, (err) => resolve());
    });

    // Добавляем участников чата
    for (const memberId of [...members, creatorId]) {
      await new Promise((resolve) => {
        addChatMember(chatId, memberId, (err) => resolve());
      });
    }

    res.json({ id: chatId, name, type });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/messages', async (req, res) => {
  try {
    const { chatId, senderId, text } = req.body;
    if (!chatId || !senderId || !text) {
      return res.status(400).json({ error: 'Invalid message data' });
    }

    const messageId = uuid.v4();
    const messageData = { id: messageId, chatId, senderId, text };

    await new Promise((resolve) => {
      createMessage(messageData, (err) => resolve());
    });

    // Отправляем сообщение всем подключенным клиентам
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: 'new_message',
          data: { ...messageData, sender: { id: senderId } }
        }));
      }
    });

    res.json(messageData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// WebSocket Server
wss.on('connection', (ws) => {
  ws.on('message', (message) => {
    console.log('Received:', message.toString());
  });

  ws.send(JSON.stringify({ type: 'connected', data: 'Welcome to Messenger' }));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = path.join(__dirname, 'messenger.db');
const db = new sqlite3.Database(dbPath);

// Инициализация базы данных
db.serialize(() => {
  // Создание таблицы пользователей
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE,
      password TEXT,
      avatar TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Создание таблицы чатов
  db.run(`
    CREATE TABLE IF NOT EXISTS chats (
      id TEXT PRIMARY KEY,
      name TEXT,
      type TEXT CHECK(type IN ('private', 'group')),
      creator_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (creator_id) REFERENCES users(id)
    )
  `);

  // Создание таблицы участников чатов
  db.run(`
    CREATE TABLE IF NOT EXISTS chat_members (
      chat_id TEXT,
      user_id TEXT,
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (chat_id, user_id),
      FOREIGN KEY (chat_id) REFERENCES chats(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Создание таблицы сообщений
  db.run(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      chat_id TEXT,
      sender_id TEXT,
      text TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (chat_id) REFERENCES chats(id),
      FOREIGN KEY (sender_id) REFERENCES users(id)
    )
  `);
});

// Методы для работы с пользователями
const createUser = (username, password, callback) => {
  const id = require('uuid').v4();
  const avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=5865F2&color=fff`;
  bcrypt.hash(password, 10, (err, hash) => {
    if (err) return callback(err);
    db.run(
      'INSERT INTO users (id, username, password, avatar) VALUES (?, ?, ?, ?)',
      [id, username, hash, avatar],
      (err) => callback(err, { id, username, avatar })
    );
  });
};

const findUserByUsername = (username, callback) => {
  db.get('SELECT * FROM users WHERE username = ?', [username], callback);
};

// Методы для работы с чатами
const createChat = (chatData, callback) => {
  const { id, name, type, creatorId } = chatData;
  db.run(
    'INSERT INTO chats (id, name, type, creator_id) VALUES (?, ?, ?, ?)',
    [id, name, type, creatorId],
    (err) => callback(err, chatData)
  );
};

const addChatMember = (chatId, userId, callback) => {
  db.run(
    'INSERT INTO chat_members (chat_id, user_id) VALUES (?, ?)',
    [chatId, userId],
    callback
  );
};

const getUserChats = (userId, callback) => {
  db.all(`
    SELECT c.* FROM chats c
    JOIN chat_members cm ON c.id = cm.chat_id
    WHERE cm.user_id = ?
    ORDER BY (SELECT MAX(created_at) FROM messages WHERE chat_id = c.id) DESC
  `, [userId], callback);
};

// Методы для работы с сообщениями
const createMessage = (messageData, callback) => {
  const { id, chatId, senderId, text } = messageData;
  db.run(
    'INSERT INTO messages (id, chat_id, sender_id, text) VALUES (?, ?, ?, ?)',
    [id, chatId, senderId, text],
    (err) => callback(err, messageData)
  );
};

const getChatMessages = (chatId, callback) => {
  db.all(`
    SELECT m.*, u.username, u.avatar FROM messages m
    JOIN users u ON m.sender_id = u.id
    WHERE m.chat_id = ?
    ORDER BY m.created_at ASC
  `, [chatId], callback);
};

module.exports = {
  createUser,
  findUserByUsername,
  createChat,
  addChatMember,
  getUserChats,
  createMessage,
  getChatMessages
};
// src/socket/index.js

const { saveMessage, getHistory } = require('./dmHistory')
const {
  broadcastPresence,
  startTyping,
  stopTyping,
  clearTypingTimer
} = require('./presence')

module.exports = function initSocket(io) {

  // Guarda metadados dos usuários em memória
  // { socketId -> { username, rooms[] } }
  const users = new Map()

  io.on('connection', (socket) => {
    console.log(`Conectou: ${socket.id}`)

    // ── Registro do usuário ──────────────────────────────
    socket.on('user:join', ({ username }) => {
      users.set(socket.id, { username, rooms: [] })

      // Armazena também no socket.data para buscas internas
      socket.data.username = username

      console.log(`${username} entrou no servidor`)
      socket.emit('user:joined', { socketId: socket.id, username })

      // Avisa todos que a lista de presença mudou
      broadcastPresence(io, users)
    })

    // ── Entrar em uma sala ───────────────────────────────
    socket.on('room:join', ({ room }) => {
      const user = users.get(socket.id)
      if (!user) return socket.emit('error', { msg: 'Faça login primeiro' })

      socket.join(room)
      user.rooms.push(room)

      socket.to(room).emit('room:user_joined', {
        username: user.username,
        room,
        at: new Date().toISOString()
      })

      const members = getRoomMembers(io, users, room)
      socket.emit('room:joined', { room, members })

      console.log(`${user.username} entrou na sala: ${room}`)
    })

    // ── Mensagem em sala ─────────────────────────────────
    socket.on('room:message', ({ room, text }) => {
      const user = users.get(socket.id)
      if (!user) return socket.emit('error', { msg: 'Faça login primeiro' })

      const message = {
        from: user.username,
        room,
        text,
        at: new Date().toISOString()
      }

      io.to(room).emit('room:message', message)
    })

    // ── Sair de uma sala ─────────────────────────────────
    socket.on('room:leave', ({ room }) => {
      const user = users.get(socket.id)
      if (!user) return

      socket.leave(room)
      user.rooms = user.rooms.filter(r => r !== room)

      socket.to(room).emit('room:user_left', {
        username: user.username,
        room,
        at: new Date().toISOString()
      })

      console.log(`${user.username} saiu da sala: ${room}`)
    })

    // ── Mensagem privada ─────────────────────────────────
    socket.on('dm:send', ({ toUsername, text }) => {
      const sender = users.get(socket.id)
      if (!sender) return socket.emit('error', { msg: 'Faça login primeiro' })

      const recipientEntry = [...users.entries()]
        .find(([, u]) => u.username === toUsername)

      if (!recipientEntry) {
        return socket.emit('error', { msg: `Usuário "${toUsername}" não encontrado` })
      }

      const [recipientSocketId] = recipientEntry

      const message = saveMessage(sender.username, toUsername, text)

      io.to(recipientSocketId).emit('dm:received', message)
      socket.emit('dm:sent', message)
    })

    // ── Buscar histórico de DM ───────────────────────────
    socket.on('dm:history', ({ withUsername }) => {
      const requester = users.get(socket.id)
      if (!requester) return socket.emit('error', { msg: 'Faça login primeiro' })

      const msgs = getHistory(requester.username, withUsername)
      socket.emit('dm:history', { withUsername, messages: msgs })
    })

    // ── Lista de usuários online ─────────────────────────
    socket.on('presence:get', () => {
      broadcastPresence(io, users)
    })

    // ── Typing indicator ─────────────────────────────────
    socket.on('typing:start', ({ room, toUsername }) => {
      startTyping(io, socket, users, { room, toUsername })
    })

    socket.on('typing:stop', ({ room, toUsername }) => {
      stopTyping(io, socket, users, { room, toUsername })
    })

    // ── Desconexão ───────────────────────────────────────
    socket.on('disconnect', () => {
      const user = users.get(socket.id)
      if (!user) return

      // Limpa timer de typing se existir
      clearTypingTimer(socket.id)

      user.rooms.forEach(room => {
        socket.to(room).emit('room:user_left', {
          username: user.username,
          room,
          at: new Date().toISOString()
        })
      })

      users.delete(socket.id)
      console.log(`Desconectou: ${user.username}`)

      // Atualiza lista de presença para todos
      broadcastPresence(io, users)
    })
  })
}

// ── Helper: lista membros de uma sala ─────────────────────
function getRoomMembers(io, users, room) {
  const socketIds = io.sockets.adapter.rooms.get(room) ?? new Set()
  return [...socketIds].map(id => ({
    socketId: id,
    username: users.get(id)?.username ?? 'desconhecido'
  }))
}
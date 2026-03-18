// Controla timeouts de "digitando..." por socket
// { socketId -> timeoutId }
const typingTimers = new Map()

const TYPING_TIMEOUT_MS = 3000

// Emite lista atualizada de usuários online para todos
function broadcastPresence(io, users) {
  const online = [...users.values()].map(u => ({
    username: u.username,
    rooms: u.rooms
  }))

  io.emit('presence:list', { users: online })
}

// Registra que um usuário está digitando
// Dispara um timeout para limpar automaticamente se necessário
function startTyping(io, socket, users, { room, toUsername }) {
  const user = users.get(socket.id)
  if (!user) return

  // Limpa timeout anterior se ainda estava rodando
  clearTypingTimer(socket.id)

  emitTypingUpdate(io, socket, user.username, { room, toUsername }, true)

  // Auto-stop após TYPING_TIMEOUT_MS
  const timer = setTimeout(() => {
    emitTypingUpdate(io, socket, user.username, { room, toUsername }, false)
    typingTimers.delete(socket.id)
  }, TYPING_TIMEOUT_MS)

  typingTimers.set(socket.id, timer)
}

// Registra que o usuário parou de digitar
function stopTyping(io, socket, users, { room, toUsername }) {
  const user = users.get(socket.id)
  if (!user) return

  clearTypingTimer(socket.id)
  emitTypingUpdate(io, socket, user.username, { room, toUsername }, false)
}

// Limpa o timer de um socket ao desconectar
function clearTypingTimer(socketId) {
  if (typingTimers.has(socketId)) {
    clearTimeout(typingTimers.get(socketId))
    typingTimers.delete(socketId)
  }
}

// Decide para onde mandar o evento de typing
// Sala pública → broadcast para a sala
// DM → socket específico do destinatário
function emitTypingUpdate(io, socket, username, { room, toUsername }, isTyping) {
  const payload = { username, isTyping }

  if (room) {
    // Emite para todos na sala exceto quem está digitando
    socket.to(room).emit('typing:update', { ...payload, room })
    return
  }

  if (toUsername) {
    // Procura o socketId do destinatário
    const sockets = io.sockets.sockets
    for (const [id, s] of sockets) {
      if (s.data?.username === toUsername) {
        io.to(id).emit('typing:update', { ...payload, from: username })
        return
      }
    }
  }
}

module.exports = { broadcastPresence, startTyping, stopTyping, clearTypingTimer }
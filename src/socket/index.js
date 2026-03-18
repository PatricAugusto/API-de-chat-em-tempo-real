module.exports = function initSocket(io) {

  // Guarda metadados dos usuários em memória
  // { socketId -> { username, rooms[] } }
  const users = new Map()

  io.on('connection', (socket) => {
    console.log(`Conectou: ${socket.id}`)

    // ── Registro do usuário ──────────────────────────────
    socket.on('user:join', ({ username }) => {
      users.set(socket.id, { username, rooms: [] })
      console.log(`${username} entrou no servidor`)

      // Confirma o registro para quem enviou
      socket.emit('user:joined', { socketId: socket.id, username })
    })

    // ── Entrar em uma sala ───────────────────────────────
    socket.on('room:join', ({ room }) => {
      const user = users.get(socket.id)
      if (!user) return socket.emit('error', { msg: 'Faça login primeiro' })

      socket.join(room)
      user.rooms.push(room)

      // Avisa todos na sala (exceto quem entrou)
      socket.to(room).emit('room:user_joined', {
        username: user.username,
        room,
        at: new Date().toISOString()
      })

      // Envia para quem entrou a lista de membros atuais
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

      // Envia para TODOS na sala (incluindo quem enviou)
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

    // ── Desconexão ───────────────────────────────────────
    socket.on('disconnect', () => {
      const user = users.get(socket.id)
      if (!user) return

      // Avisa todas as salas que o usuário estava
      user.rooms.forEach(room => {
        socket.to(room).emit('room:user_left', {
          username: user.username,
          room,
          at: new Date().toISOString()
        })
      })

      users.delete(socket.id)
      console.log(`Desconectou: ${user.username}`)
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
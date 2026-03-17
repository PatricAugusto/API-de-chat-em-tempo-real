module.exports = function initSocket(io) {

  io.on('connection', (socket) => {
    console.log(`Usuário conectou: ${socket.id}`)

    // Evento personalizado: cliente envia uma mensagem
    socket.on('message', (data) => {
      console.log('Mensagem recebida:', data)

      // Reenvia para TODOS conectados (incluindo quem enviou)
      io.emit('message', {
        from: socket.id,
        text: data.text,
        at: new Date().toISOString()
      })
    })

    socket.on('disconnect', () => {
      console.log(`Usuário desconectou: ${socket.id}`)
    })
  })

}
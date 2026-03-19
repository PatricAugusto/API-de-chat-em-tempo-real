const jwt = require('jsonwebtoken')

const SECRET = process.env.JWT_SECRET

module.exports = function authMiddleware(socket, next) {
  // O cliente envia o token em socket.handshake.auth.token
  const token = socket.handshake.auth?.token

  if (!token) {
    return next(new Error('Token não fornecido'))
  }

  try {
    const payload = jwt.verify(token, SECRET)

    // Anexa os dados do usuário ao socket para uso posterior
    socket.data.user = {
      username: payload.username
    }

    next()
  } catch (err) {
    next(new Error('Token inválido ou expirado'))
  }
}
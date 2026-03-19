require('dotenv').config()

const express = require('express')
const { createServer } = require('http')
const { Server } = require('socket.io')

const authRoutes = require('./routes/auth')
const authMiddleware = require('./socket/authMiddleware')

const app = express()
const httpServer = createServer(app)

const io = new Server(httpServer, {
    cors: { origin: '*' }
})

app.use(express.json())

app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() })
})
app.use('/auth', authRoutes)

// Middleware de autenticação WebSocket
// Roda antes de qualquer conexão ser aceita
io.use(authMiddleware)

require('./socket')(io)

const PORT = process.env.PORT || 3000
httpServer.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`)
})
const express = require('express')
const { createServer } = require('http')

const app = express()
const httpServer = createServer(app)

app.use(express.json())

app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() })
})

const PORT = process.env.PORT || 3000

httpServer.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`)
})
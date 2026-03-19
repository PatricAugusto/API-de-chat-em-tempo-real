const express = require('express')
const jwt = require('jsonwebtoken')

const router = express.Router()
const SECRET = process.env.JWT_SECRET

// POST /auth/login
// Body: { username: string }
// Retorna: { token: string }
router.post('/login', (req, res) => {
  const { username } = req.body

  if (!username || typeof username !== 'string' || username.trim() === '') {
    return res.status(400).json({ error: 'username é obrigatório' })
  }

  const payload = {
    username: username.trim(),
    // iat (issued at) é adicionado automaticamente pelo jwt.sign
  }

  const token = jwt.sign(payload, SECRET, { expiresIn: '8h' })

  res.json({ token, username: payload.username })
})

module.exports = router
// Histórico de DMs em memória
// Chave: 'UserA:UserB' (sempre ordem alfabética)
// Valor: array de mensagens

const history = new Map()

function getKey(userA, userB) {
  return [userA, userB].sort().join(':')
}

function saveMessage(fromUsername, toUsername, text) {
  const key = getKey(fromUsername, toUsername)

  if (!history.has(key)) {
    history.set(key, [])
  }

  const message = {
    from: fromUsername,
    to: toUsername,
    text,
    at: new Date().toISOString()
  }

  history.get(key).push(message)

  // Mantém no máximo 50 mensagens por conversa
  const msgs = history.get(key)
  if (msgs.length > 50) msgs.shift()

  return message
}

function getHistory(userA, userB) {
  const key = getKey(userA, userB)
  return history.get(key) ?? []
}

module.exports = { saveMessage, getHistory }
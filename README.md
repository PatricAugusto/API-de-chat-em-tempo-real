# chat-api

API de chat em tempo real com suporte a salas, mensagens privadas e presença de usuários, construída com Node.js, Express e Socket.IO.

---

## Sumário

- [Visão geral](#visão-geral)
- [Tecnologias](#tecnologias)
- [Instalação](#instalação)
- [Configuração](#configuração)
- [Rodando o projeto](#rodando-o-projeto)
- [Autenticação](#autenticação)
- [Referência de eventos WebSocket](#referência-de-eventos-websocket)
  - [Salas](#salas)
  - [Mensagens privadas (DM)](#mensagens-privadas-dm)
  - [Presença](#presença)
  - [Typing indicator](#typing-indicator)
- [Rotas HTTP](#rotas-http)
- [Estrutura do projeto](#estrutura-do-projeto)

---

## Visão geral

O chat-api oferece comunicação bidirecional em tempo real via WebSockets. Os principais recursos são:

- Autenticação via JWT no handshake WebSocket
- Salas públicas com broadcast para membros
- Mensagens privadas entre usuários com histórico em memória
- Presença de usuários online em tempo real
- Typing indicator com timeout automático de 3 segundos

---

## Tecnologias

| Pacote | Versão | Função |
|---|---|---|
| Node.js | 18+ | runtime |
| Express | ^4 | servidor HTTP e rotas REST |
| Socket.IO | ^4 | WebSockets com fallback automático |
| jsonwebtoken | ^9 | geração e verificação de tokens JWT |
| dotenv | ^16 | variáveis de ambiente |
| nodemon | ^3 | reload automático em desenvolvimento |

---

## Instalação

```bash
git clone <url-do-repositorio>
cd chat-api
npm install
```

---

## Configuração

Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:

```env
JWT_SECRET=troque_por_uma_chave_longa_e_aleatoria
PORT=3000
```

> O arquivo `.env` já está no `.gitignore` e nunca deve ser commitado.

---

## Rodando o projeto

**Desenvolvimento** (com reload automático):
```bash
npm run dev
```

**Produção:**
```bash
npm start
```

O servidor estará disponível em `http://localhost:3000`.

---

## Autenticação

Toda conexão WebSocket exige um token JWT válido, enviado no handshake.

**1. Obter o token via HTTP:**

```http
POST /auth/login
Content-Type: application/json

{ "username": "Ana" }
```

Resposta:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "username": "Ana"
}
```

**2. Conectar ao WebSocket com o token:**

```js
const socket = io('http://localhost:3000', {
  auth: { token }
})

socket.on('connect_error', (err) => {
  console.error(err.message) // "Token inválido ou expirado"
})
```

O token expira em 8 horas. Conexões sem token ou com token inválido são recusadas antes de chegarem ao servidor de eventos.

---

## Referência de eventos WebSocket

### Salas

#### `room:join`
Entra em uma sala. Notifica os outros membros da chegada.

```js
// Enviar
socket.emit('room:join', { room: 'geral' })

// Receber (confirmação para quem entrou)
socket.on('room:joined', ({ room, members }) => {
  // members: [{ socketId, username }]
})

// Receber (para os outros membros da sala)
socket.on('room:user_joined', ({ username, room, at }) => {})
```

---

#### `room:leave`
Sai de uma sala. Notifica os outros membros.

```js
// Enviar
socket.emit('room:leave', { room: 'geral' })

// Receber (para os outros membros da sala)
socket.on('room:user_left', ({ username, room, at }) => {})
```

---

#### `room:message`
Envia uma mensagem para todos os membros de uma sala.

```js
// Enviar
socket.emit('room:message', { room: 'geral', text: 'Olá!' })

// Receber (todos na sala, incluindo quem enviou)
socket.on('room:message', ({ from, room, text, at }) => {})
```

---

### Mensagens privadas (DM)

#### `dm:send`
Envia uma mensagem privada para um usuário pelo username. A mensagem é salva no histórico em memória (limite de 50 por conversa).

```js
// Enviar
socket.emit('dm:send', { toUsername: 'Bruno', text: 'Oi!' })

// Receber confirmação (para quem enviou)
socket.on('dm:sent', ({ from, to, text, at }) => {})

// Receber mensagem (para o destinatário)
socket.on('dm:received', ({ from, to, text, at }) => {})
```

---

#### `dm:history`
Busca o histórico de mensagens entre o usuário autenticado e outro usuário.

```js
// Enviar
socket.emit('dm:history', { withUsername: 'Bruno' })

// Receber
socket.on('dm:history', ({ withUsername, messages }) => {
  // messages: [{ from, to, text, at }]
})
```

---

### Presença

#### `presence:get`
Solicita a lista atual de usuários online. A lista também é emitida automaticamente sempre que um usuário entra ou sai do servidor.

```js
// Enviar
socket.emit('presence:get')

// Receber (todos os clientes conectados)
socket.on('presence:list', ({ users }) => {
  // users: [{ username, rooms[] }]
})
```

---

### Typing indicator

#### `typing:start` / `typing:stop`
Indica que o usuário está ou parou de digitar. Funciona tanto em salas quanto em DMs. O servidor aplica um timeout automático de 3 segundos — se o cliente não emitir `typing:stop`, o indicador é apagado automaticamente.

```js
// Em uma sala
socket.emit('typing:start', { room: 'geral' })
socket.emit('typing:stop',  { room: 'geral' })

// Em uma DM
socket.emit('typing:start', { toUsername: 'Bruno' })
socket.emit('typing:stop',  { toUsername: 'Bruno' })

// Receber (para os outros na sala ou para o destinatário da DM)
socket.on('typing:update', ({ username, isTyping, room }) => {})
```

---

## Rotas HTTP

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/health` | Status do servidor e uptime |
| `POST` | `/auth/login` | Gera token JWT para o username informado |

---

## Estrutura do projeto

```
chat-api/
├── src/
│   ├── server.js                 # ponto de entrada, configuração Express + Socket.IO
│   ├── routes/
│   │   └── auth.js               # POST /auth/login
│   └── socket/
│       ├── index.js              # registro de todos os eventos WebSocket
│       ├── authMiddleware.js     # verificação JWT no handshake
│       ├── dmHistory.js          # histórico de mensagens privadas em memória
│       └── presence.js           # presença online e typing indicator
├── .env                          # variáveis de ambiente (não versionado)
├── .gitignore
└── package.json
```

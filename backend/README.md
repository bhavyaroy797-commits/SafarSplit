# SafarSplit — Backend

> **Safar bhi, hisaab bhi.** 🧳💰
>
> Collaborative group trip planner & expense splitter with a desi flavour —
> UPI settle-ups, Hinglish expense parsing, AI itineraries on open-weight models.

---

## Tech Stack

Node.js · Express · PostgreSQL (raw `pg`) · JWT + bcrypt · Zod · Socket.io ·
Multer · Ollama (open-weight LLMs) · OSRM

---

## Requirements

- Node.js ≥ 18
- PostgreSQL ≥ 13
- (Optional, for AI) [Ollama](https://ollama.com) **or** any OpenAI-compatible provider

---

## Setup

```bash
npm install
cp .env.example .env
# edit .env → set DATABASE_URL, JWT_SECRET, and AI provider vars

createdb safarsplit
psql -U postgres -d safarsplit -f ./sql/schema.sql

npm run dev
```

Server runs on `http://localhost:${PORT}` and Socket.io shares the same port.

---

## Folder Layout

```
src/
  config/       # env, db pool, constants
  middleware/   # auth, validation, error, rate-limit, upload
  utils/        # money (paise), splitter, settleUp, upi, jwt, aiJson
  validators/   # Zod schemas
  services/     # business logic (SQL lives here)
  controllers/  # thin HTTP layer
  routes/       # versioned /api/v1
  sockets/      # Socket.io rooms per trip, JWT handshake
```

---

## Money

All amounts are **integer paise** (1 INR = 100 paise). Never use floats for money.

---

## AI Providers

SafarSplit's AI service is **pluggable**. Pick a provider with `AI_PROVIDER` in `.env`.

### Option 1: Ollama (default — free, local, private, offline)

Runs open-weight models (Gemma, Llama, Qwen, DeepSeek) on your machine.
No API key, no cost, works offline.

```bash
ollama pull gemma2:9b
# or: ollama pull deepseek-r1:7b | qwen2.5:7b | llama3.1:8b
```

```env
AI_PROVIDER=ollama
AI_MODEL=gemma2:9b
OLLAMA_URL=http://localhost:11434
```

### Option 2: OpenAI-compatible cloud providers

Works with **any** provider exposing `/v1/chat/completions`:
DeepSeek API, DigitalOcean GenAI, Groq, Together.ai, OpenRouter, Fireworks,
vLLM, LM Studio, and more.

| Provider            | `AI_API_URL`                | Example `AI_MODEL`                              |
| ------------------- | --------------------------- | ----------------------------------------------- |
| DeepSeek            | `https://api.deepseek.com`  | `deepseek-chat`                                 |
| DigitalOcean GenAI  | `https://inference.do-ai.run` | `llama3.3-70b-instruct`                       |
| Groq (free tier)    | `https://api.groq.com/openai` | `llama-3.3-70b-versatile`                     |
| Together.ai         | `https://api.together.xyz`  | `meta-llama/Llama-3.3-70B-Instruct-Turbo`       |
| OpenRouter          | `https://openrouter.ai/api` | `deepseek/deepseek-chat`                        |

```env
AI_PROVIDER=openai-compatible
AI_API_URL=https://api.deepseek.com
AI_API_KEY=sk-xxxxxxxxxxxxxxxx
AI_MODEL=deepseek-chat
```

Every AI call is logged to the `ai_requests` table with
`model = "<provider>:<model>"`, so you can audit usage across providers.

---

## Socket.io

Authenticate with JWT via `auth: { token }`. Then:

- `socket.emit('trip:join', { tripId }, ack)` — join a trip room
- `socket.emit('trip:leave', { tripId }, ack)`

Server emits: `itinerary:created|updated|deleted|reordered`, `vote:updated`,
`expense:created|deleted`, `settleup:updated`, `attachment:created|deleted`,
`member:joined`, `trip:updated|deleted`, `presence:online|offline`.

---

## API Endpoints (v1)

Base: `/api/v1`. All responses: `{ success, data, error }`.

### Auth
| Method | Path        | Auth | Purpose                        |
| ------ | ----------- | ---- | ------------------------------ |
| POST   | `/auth/register` | ❌ | Register, returns JWT         |
| POST   | `/auth/login`    | ❌ | Login, returns JWT            |
| GET    | `/auth/me`       | ✅ | Current user                  |
| PATCH  | `/auth/me`       | ✅ | Update name / phone / UPI id  |

### Trips
| Method | Path             | Auth        | Purpose                    |
| ------ | ---------------- | ----------- | -------------------------- |
| POST   | `/trips`         | ✅          | Create trip                |
| GET    | `/trips`         | ✅          | List my trips              |
| POST   | `/trips/join`    | ✅          | Join via `{ joinCode }`    |
| GET    | `/trips/:tripId` | ✅ (member) | Trip + members             |
| PATCH  | `/trips/:tripId` | ✅ (owner)  | Update                     |
| DELETE | `/trips/:tripId` | ✅ (owner)  | Delete                     |

### Itinerary
| Method | Path                                | Auth   | Purpose            |
| ------ | ----------------------------------- | ------ | ------------------ |
| GET    | `/trips/:tripId/itinerary`          | member | List items         |
| POST   | `/trips/:tripId/itinerary`          | member | Create item        |
| POST   | `/trips/:tripId/itinerary/reorder`  | member | Reorder items      |
| PATCH  | `/items/:itemId`                    | member | Update item        |
| DELETE | `/items/:itemId`                    | member | Delete item        |

### Votes
| Method | Path                          | Auth   | Purpose                 |
| ------ | ----------------------------- | ------ | ----------------------- |
| GET    | `/trips/:tripId/votes`        | member | List votes              |
| POST   | `/trips/:tripId/votes`        | member | Cast/update a vote      |
| DELETE | `/trips/:tripId/votes/:itemId`| member | Remove my vote          |

### Expenses
| Method | Path                              | Auth   | Purpose                        |
| ------ | --------------------------------- | ------ | ------------------------------ |
| GET    | `/trips/:tripId/expenses`         | member | List expenses w/ splits        |
| POST   | `/trips/:tripId/expenses`         | member | Add expense                    |
| GET    | `/trips/:tripId/expenses/balances`| member | Net balances per member        |
| GET    | `/trips/:tripId/expenses/settle-up`| member| Minimum settle-up + UPI links  |
| GET    | `/trips/:tripId/expenses/:id`     | member | Single expense                 |
| DELETE | `/trips/:tripId/expenses/:id`     | member | Delete expense                 |

### Wallet
| Method | Path                       | Auth | Purpose              |
| ------ | -------------------------- | ---- | -------------------- |
| GET    | `/wallet`                  | ✅   | Get my wallet        |
| GET    | `/wallet/transactions`     | ✅   | List transactions    |
| POST   | `/wallet/top-up`           | ✅   | Manual credit        |
| POST   | `/wallet/transfer`         | ✅   | Transfer to member   |

### Attachments
| Method | Path                                        | Auth           | Purpose     |
| ------ | ------------------------------------------- | -------------- | ----------- |
| GET    | `/trips/:tripId/attachments`                | member         | List        |
| POST   | `/trips/:tripId/attachments`                | member         | Upload      |
| GET    | `/attachments/:attachmentId/download`       | ✅             | Download    |
| DELETE | `/attachments/:attachmentId`                | ✅ (uploader)  | Delete      |

### AI
| Method | Path                                   | Auth   | Purpose                   |
| ------ | -------------------------------------- | ------ | ------------------------- |
| POST   | `/trips/:tripId/ai/generate-itinerary` | member | AI itinerary from brief   |
| POST   | `/trips/:tripId/ai/replan`             | member | Re-plan affected days     |
| POST   | `/trips/:tripId/ai/parse-expense`      | member | Hinglish/English parser   |
| POST   | `/trips/:tripId/ai/explain-stop`       | member | Explain why a stop        |

### Health
| Method | Path             | Auth | Purpose    |
| ------ | ---------------- | ---- | ---------- |
| GET    | `/api/v1/health` | ❌   | Liveness   |

---

## License

MIT — Safar bhi, hisaab bhi. 🧡
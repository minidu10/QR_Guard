# QRGuard

QRGuard stops **fake QR sticker scams** at shops in Sri Lanka.

A scammer sticks his own QR code over a shop's real LankaQR code. Customers pay the scammer.
QRGuard helps customers, shop owners and the bank team catch this early.

> Built for **Geveo Ignite 2026**. It uses a **fake payment system**. It does not connect to real banks or LankaPay.

## Project layout

```
qrguard/
├── apps/
│   ├── web/          # Next.js 15 (customer, owner, admin pages)
│   ├── api/          # NestJS REST API (+ WebSocket later)
│   └── ai-service/   # Python FastAPI (tamper + anomaly models)
├── packages/
│   ├── types/        # shared TypeScript types
│   └── config/       # shared tsconfig + ESLint
└── infra/
    └── docker-compose.yml
```

## Run everything with Docker

You need Docker with Compose v2.

```bash
cd infra
cp .env.example .env      # then fill in the secrets and passwords
docker compose up --build
```

In `infra/.env` you must set `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` (make each with
`openssl rand -hex 32`) and `SEED_PASSWORD`.

Or from the repo root: `pnpm docker:up` (and `pnpm docker:down`).

When it is ready:

| Service                            | URL                                 |
| ---------------------------------- | ----------------------------------- |
| Web app (shows live system status) | http://localhost:3000               |
| API health                         | http://localhost:4000/api/v1/health |
| API docs (Swagger)                 | http://localhost:4000/api/docs      |
| AI service health                  | http://localhost:8000/health        |
| AI service docs                    | http://localhost:8000/docs          |
| MinIO console                      | http://localhost:9001               |

`docker compose ps` should show every service as `healthy`. `minio-init` shows `Exited (0)`.
It only creates the storage bucket, then stops.

> Note: MinIO no longer publishes official Docker images. We use `pgsty/minio`, a maintained
> community build of the same server.

## Demo data

Fill the database with 4 demo users, 5 shops (Colombo, Kandy, Galle, Nugegoda, Pettah),
one QR code per shop and 14 days of fake payments:

```bash
cd infra
docker compose exec api node dist/seed/run.js
```

> This **deletes** all users, shops, QR codes and payments first.

Demo logins (password = your `SEED_PASSWORD`):

| Email               | Role                                   |
| ------------------- | -------------------------------------- |
| admin@qrguard.lk    | admin (bank team)                      |
| owner1@qrguard.lk   | shop owner (3 shops)                   |
| owner2@qrguard.lk   | shop owner (2 shops, one not verified) |
| customer@qrguard.lk | customer                               |

## Run apps without Docker (for development)

You need Node.js 22+, pnpm 10 and Python 3.12+.
Start only the databases with Docker:

```bash
cd infra && docker compose up -d mongo redis minio minio-init ai-service
```

Then, from the repo root:

```bash
pnpm install
cp apps/api/.env.example apps/api/.env          # use the same MinIO user/password as infra/.env
cp apps/web/.env.example apps/web/.env.local
pnpm dev                                        # runs web (3000) and api (4000)
pnpm --filter api seed                          # demo data (uses apps/api/.env)
```

AI service on its own:

```bash
cd apps/ai-service
python -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
uvicorn app.main:app --reload --port 8000
```

## Checks

```bash
pnpm lint        # ESLint
pnpm typecheck   # TypeScript
pnpm test        # Jest (API)
pnpm build       # build all apps

cd apps/ai-service && pytest && ruff check .
```

## Health check

`GET /api/v1/health` checks MongoDB, Redis, file storage and the AI service.
It returns `200` when all are up, and `503` if one is down.

## API so far

All routes are under `/api/v1`. Full docs: http://localhost:4000/api/docs

| Route                                 | Who               | What                                                             |
| ------------------------------------- | ----------------- | ---------------------------------------------------------------- |
| `POST /auth/register`                 | anyone            | sign up as customer or owner                                     |
| `POST /auth/login`                    | anyone            | get access + refresh tokens                                      |
| `POST /auth/refresh`                  | anyone            | swap a refresh token for a new pair (old one stops working)      |
| `POST /shops`                         | owner, admin      | create a shop (inside Sri Lanka)                                 |
| `GET /shops/:id`                      | anyone            | one shop                                                         |
| `GET /shops/nearby?lat=&lng=&radius=` | anyone            | shops near a point, closest first                                |
| `POST /shops/:id/qrcodes`             | shop owner, admin | new QR code (+ PNG image). `{ "rotate": true }` revokes old ones |
| `PATCH /qrcodes/:id/revoke`           | shop owner, admin | revoke a QR code                                                 |

QR codes use the **EMVCo format** (same as LankaQR) with a CRC checksum.
They use a fake `LK.QRGUARD.DEMO` id, so they never work in a real bank app.

## Build phases

- [x] **Phase 1** – Setup (monorepo, Docker, health checks)
- [x] **Phase 2** – Auth, shops, QR codes, seed data, login + sign-up pages
- [ ] Phase 3 – Scan check
- [ ] Phase 4 – Real-time alerts
- [ ] Phase 5 – AI service (mock)
- [ ] Phase 6 – Payment anomaly job
- [ ] Phase 7 – Risk score + reports + admin map
- [ ] Phase 8 – Real AI models
- [ ] Phase 9 – Demo page + polish
- [ ] Phase 10 – CI/CD + deploy

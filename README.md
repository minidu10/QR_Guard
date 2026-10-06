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
cp .env.example .env      # then change the passwords
docker compose up --build
```

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

## Build phases

- [x] **Phase 1** – Setup (monorepo, Docker, health checks)
- [ ] Phase 2 – Auth, shops, QR codes, seed data
- [ ] Phase 3 – Scan check
- [ ] Phase 4 – Real-time alerts
- [ ] Phase 5 – AI service (mock)
- [ ] Phase 6 – Payment anomaly job
- [ ] Phase 7 – Risk score + reports + admin map
- [ ] Phase 8 – Real AI models
- [ ] Phase 9 – Demo page + polish
- [ ] Phase 10 – CI/CD + deploy

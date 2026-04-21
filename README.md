# Location-based-Request-Task-Workflow-Module

QR okutuldugunda public kullanicinin lokasyona bagli talep actigi, talebin otomatik task'a donustugu ve personel tarafinin JWT ile korundugu NestJS + Nuxt monorepo MVP'si.

## Yapi

```text
/
  apps/
    api/        NestJS API, Prisma schema, migrations, seed
    web/        Nuxt web uygulamasi
  packages/
    shared/     Ortak enumlar
  infra/
    docker-compose.yml
  .env.example
  README.md
```

## Teknolojiler

- Monorepo: pnpm workspace
- API: NestJS, Prisma, PostgreSQL
- Web: Nuxt 3, Vue 3, TypeScript
- Auth: JWT access token + role-based authorization
- Password hashing: bcryptjs

## Roller

- `ADMIN`
- `SUPERVISOR`
- `STAFF`

Yetki ozet:

- `STAFF`: task listesi, task detayi, `start`, `complete`
- `SUPERVISOR`: STAFF yetkileri + `approve`, `reject`
- `ADMIN`: task, QR, location ve user listesi endpointleri

## Public ve Protected Akis

Public kalan route'lar:

- `GET /health`
- `GET /public/qr/:token`
- `POST /public/requests`
- Nuxt public QR sayfasi: `/q/[token]`
- Login sayfasi: `/login`

JWT gerektiren route'lar:

- `GET /auth/me`
- `GET /tasks`
- `GET /tasks/:id`
- `PATCH /tasks/:id/start`
- `PATCH /tasks/:id/complete`
- `PATCH /tasks/:id/approve`
- `PATCH /tasks/:id/reject`
- `GET /qr-codes`
- `GET /qr-codes/:id`
- `GET /qr-codes/:id/scan-logs`
- `POST /qr-codes`
- `PATCH /qr-codes/:id/activate`
- `PATCH /qr-codes/:id/deactivate`
- `GET /locations/tree`
- `POST /locations`
- `GET /users`

Role kisitlari:

- `approve` ve `reject`: `ADMIN`, `SUPERVISOR`
- `qr-codes` liste/detay/log: `ADMIN`, `SUPERVISOR`
- `qr-codes` create/activate/deactivate: `ADMIN`
- `locations/tree`: `ADMIN`, `SUPERVISOR`
- `locations` create: `ADMIN`
- `users`: `ADMIN`

## Auth API

### POST /auth/login

Body:

```json
{
  "email": "admin@example.com",
  "password": "Admin123!"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "accessToken": "<jwt>",
    "tokenType": "Bearer",
    "expiresIn": "1d",
    "user": {
      "id": "...",
      "email": "admin@example.com",
      "fullName": "Demo Admin",
      "role": "ADMIN",
      "isActive": true,
      "createdAt": "2026-04-21T00:00:00.000Z",
      "updatedAt": "2026-04-21T00:00:00.000Z"
    }
  }
}
```

### GET /auth/me

`Authorization: Bearer <jwt>` ile current user doner.

## Prisma

Yeni eklenen auth verisi:

- `Role` enum
- `User` modeli
  - `id`
  - `email`
  - `passwordHash`
  - `fullName`
  - `role`
  - `isActive`
  - `createdAt`
  - `updatedAt`

Migration:

- `apps/api/prisma/migrations/20260421000000_auth_users`

## Demo kullanicilar

Seed ile uretilir:

- `admin@example.com / Admin123!`
- `supervisor@example.com / Admin123!`
- `staff@example.com / Admin123!`

## Lokal kurulum

Windows PowerShell `pnpm.ps1` policy sorunu varsa `pnpm` yerine `pnpm.cmd` kullan.

```bash
pnpm install
cp .env.example .env
```

PowerShell:

```powershell
pnpm.cmd install
Copy-Item .env.example .env
```

Gerekli env'ler:

```text
DATABASE_URL=postgresql://workflow:workflow@localhost:5432/workflow?schema=public
API_PORT=3001
NUXT_PUBLIC_API_BASE_URL=http://localhost:3001
JWT_SECRET=change-me-for-production
JWT_EXPIRES_IN=1d
```

## Veritabani ve seed

Docker ile local PostgreSQL kaldirmak icin:

```bash
docker compose --env-file .env -f infra/docker-compose.yml up -d
```

Sonra:

```bash
pnpm prisma:migrate:deploy
pnpm prisma:seed
```

## Calistirma

Tum workspace:

```bash
pnpm dev
```

Ayrik:

```bash
pnpm dev:api
pnpm dev:web
```

Adresler:

- Web: `http://localhost:3000`
- API: `http://localhost:3001`
- Health: `http://localhost:3001/health`

## Web auth davranisi

- `/login` sayfasi eklendi
- access token cookie'de tutulur
- refresh sonrasi auth state `/auth/me` ile geri yuklenir
- `/admin/tasks`, `/admin/tasks/[id]`, `/admin/qrs`, `/admin/qrs/[id]`, `/admin/locations` middleware ile korunur
- login yoksa `/login` sayfasina yonlendirilir
- `STAFF` kullanicisi approve/reject butonlarini gormez
- `SUPERVISOR` ve `ADMIN` gorur
- QR aktivasyon aksiyonlari sadece `ADMIN` icin gorunur

## Build

```bash
pnpm build
```

## Hizli test

1. `pnpm prisma:migrate:deploy`
2. `pnpm prisma:seed`
3. `pnpm dev`
4. `http://localhost:3000/q/room-401-demo-token` adresinden public request olustur
5. `http://localhost:3000/login` adresinden `staff@example.com / Admin123!` ile giris yap
6. `/admin/tasks` sayfasinda task'i gor ve `Baslat` / `Tamamla` akisini dene
7. `supervisor@example.com / Admin123!` ile giris yapip ayni task icin `Onayla` / `Reddet` dene
8. `admin@example.com / Admin123!` ile giris yapip `/admin/qrs` ve `/admin/locations` ekranlarini test et

## Dogrulanan durumlar

Bu degisiklikten sonra lokal olarak dogrulananlar:

- workspace build basarili
- migration deploy basarili
- seed basarili
- `GET /health` auth istemiyor
- `GET /public/qr/:token` auth istemiyor
- `GET /tasks` token olmadan `401`
- `POST /auth/login` calisiyor
- `GET /auth/me` calisiyor
- `STAFF` kullanicisi `PATCH /tasks/:id/approve` cagriginda `403`

# QR Talep ve Gorev Yonetimi

QR Talep, ziyaretci veya hasta tarafindan QR kod ile talep olusturulan, talebin otomatik goreve donustugu, admin/supervisor/staff rollerinin web ve mobil arayuzlerden takip edebildigi multi-organization bir workflow uygulamasidir.

Monorepo icinde uc ana uygulama bulunur:

- `apps/api`: NestJS API, Prisma schema, migration ve seed dosyalari
- `apps/web`: Nuxt 3 web uygulamasi ve public QR talep akisi
- `apps/mobile`: Expo / React Native admin ve supervisor mobil uygulamasi

## Kullanilan Teknolojiler ve Mimari

**Monorepo**

- `pnpm` workspace
- Ortak tipler ve enumlar icin `packages/shared`
- Koku `package.json` uzerinden API, web, mobile ve Prisma komutlari

**Backend**

- NestJS 10
- Prisma ORM 6
- PostgreSQL
- JWT auth ve role-based authorization
- bcryptjs ile sifre hashleme
- Multer/Nest interceptor ile public request medya upload akisi
- Opsiyonel Telegram Bot API bildirimi

**Web**

- Nuxt 3
- Vue 3
- TypeScript
- Public QR sayfasi: `/q/:token`
- Admin panel: gorev, QR, lokasyon, kurum ve kullanici yonetimi

**Mobile**

- Expo SDK 54
- React Native 0.81
- React Navigation
- Zustand
- Expo SecureStore ile token saklama
- Admin ve supervisor icin native mobil ekranlar

**Mimari ozet**

```text
Public kullanici / hasta
        |
        v
Nuxt public QR sayfasi (/q/:token)
        |
        v
NestJS API (/public/qr, /public/requests)
        |
        v
PostgreSQL + Prisma
        |
        +--> Task olusur
        +--> QR scan log yazilir
        +--> Telegram bildirimi gonderilebilir

Admin / Supervisor / Staff
        |
        +--> Web admin paneli
        +--> Expo mobil uygulama
        |
        v
JWT korumali API endpointleri
```

## Roller ve Yetki Yapisi

- `ADMIN`: Tum kurumlari, kullanicilari, lokasyonlari, QR kayitlarini ve tasklari yonetir.
- `SUPERVISOR`: Sadece kendi kurumundaki verileri gorur. Task onay/red, QR ve lokasyon islemleri yapabilir.
- `STAFF`: Sadece kendi kurumundaki tasklari gorur. Task baslatma ve tamamlama aksiyonlari yapabilir.

Sistem multi-tenant calisir. `Organization` ana tenant modelidir. `SUPERVISOR` ve `STAFF` kullanicilari `organizationId` ile tek kuruma baglanir. `ADMIN` global calisabilir.

## Kurulum ve Calistirma

### Gereksinimler

- Node.js 20 veya ustu
- pnpm 9.15.4
- Docker Desktop
- Git
- Mobile icin macOS tarafinda Xcode ve iOS Simulator
- Fiziksel telefonda test icin Expo Go

pnpm aktif degilse:

```bash
corepack enable
corepack prepare pnpm@9.15.4 --activate
```

### 1. Bagimliliklari yukle

```bash
pnpm install
```

### 2. Ortam dosyalarini olustur

Kok `.env`:

```bash
cp .env.example .env
```

Mobil `.env`:

```bash
cp apps/mobile/.env.example apps/mobile/.env
```

Windows PowerShell kullaniyorsan `cp` yerine:

```powershell
Copy-Item .env.example .env
Copy-Item apps/mobile/.env.example apps/mobile/.env
```

### 3. Local database'i baslat

```bash
docker compose --env-file .env -f infra/docker-compose.yml up -d
```

Bu komut local PostgreSQL ve Redis containerlarini acabilir. Redis su an zorunlu runtime bagimliligi degildir, ileri queue/cache isleri icin hazir tutulur.

### 4. Migration ve seed calistir

```bash
pnpm prisma:migrate
pnpm prisma:seed
```

Hazir migrationlari sadece uygulamak istersen:

```bash
pnpm prisma:deploy
pnpm prisma:seed
```

### 5. API ve web'i calistir

API ve web beraber:

```bash
pnpm dev
```

Ayrik calistirma:

```bash
pnpm dev:api
pnpm dev:web
```

Adresler:

- Web: `http://localhost:3000`
- API: `http://localhost:3001`
- Health: `http://localhost:3001/health`

### 6. Mobile'i calistir

iOS Simulator:

```bash
pnpm --filter @lbrtw/mobile ios
```

Expo Metro:

```bash
pnpm dev:mobile
```

Fiziksel telefon ve Expo Go icin tunnel:

```bash
pnpm dev:mobile:tunnel
```

iOS Simulator icin `apps/mobile/.env` icinde `localhost` kullanilabilir:

```env
EXPO_PUBLIC_API_BASE_URL=http://localhost:3001
```

Fiziksel telefonda `localhost` telefonun kendisini ifade eder. Bu durumda Mac'in local IP adresini kullan:

```bash
ipconfig getifaddr en0
```

Ornek:

```env
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.8:3001
```

Telefon ve bilgisayar ayni agda olmali, API `3001` portunda acik olmalidir.

## Ortam Degiskenleri ve Config

Kok `.env.example` API, web ve Docker icin temel config'i verir.

| Degisken | Kullanildigi yer | Aciklama |
| --- | --- | --- |
| `POSTGRES_USER` | Docker | Local PostgreSQL kullanici adi |
| `POSTGRES_PASSWORD` | Docker | Local PostgreSQL sifresi |
| `POSTGRES_DB` | Docker | Local PostgreSQL database adi |
| `DATABASE_URL` | API / Prisma | PostgreSQL connection string |
| `REDIS_URL` | Infra | Opsiyonel Redis URL |
| `API_PORT` | API | Local API portu, varsayilan `3001` |
| `PORT` | API deploy | Render gibi ortamlarda servis portu |
| `JWT_SECRET` | API | JWT imzalama secret'i. Production'da degistirilmelidir |
| `JWT_EXPIRES_IN` | API | Access token suresi, ornek `1d` |
| `CORS_ORIGIN` | API | Virgul ile ayrilmis izinli browser origin listesi |
| `CORS_ORIGINS` | API | `CORS_ORIGIN` alternatifi |
| `UPLOAD_DIR` | API | Upload dosyalari icin local klasor |
| `TELEGRAM_BOT_TOKEN` | API | Opsiyonel Telegram bot token'i |
| `TELEGRAM_WEBHOOK_SECRET` | API | Opsiyonel Telegram webhook secret'i |
| `ADMIN_WEB_BASE_URL` | API | Telegram mesajlarina admin task linki eklemek icin |
| `NUXT_PUBLIC_API_BASE_URL` | Web | Nuxt tarafinin kullanacagi public API URL'i |
| `EXPO_PUBLIC_API_BASE_URL` | Mobile | Expo uygulamasinin kullanacagi API URL'i |

Production ortaminda `.env.example` degerlerini birebir kullanma. Ozellikle `JWT_SECRET`, `DATABASE_URL` ve `TELEGRAM_BOT_TOKEN` secret olarak saklanmalidir.

## Ana Moduller ve Klasor Yapisi

```text
/
  apps/
    api/
      prisma/
        schema.prisma
        seed.ts
        migrations/
      src/
        auth/
        health/
        locations/
        notifications/
        organizations/
        prisma/
        qr-codes/
        requests/
        tasks/
        users/
    web/
      pages/
        q/[token].vue
        login.vue
        admin/
      components/
      composables/
      assets/css/
    mobile/
      src/
        api/
        components/
        hooks/
        navigation/
        screens/
        store/
        types/
        utils/
  packages/
    shared/
      src/index.ts
  infra/
    docker-compose.yml
  render.yaml
```

**API modulleri**

- `auth`: Login, `/auth/me`, JWT guard, role guard, organization scope.
- `requests`: Public QR resolve ve public request olusturma akisi.
- `tasks`: Task listeleme, detay ve status transition aksiyonlari.
- `qr-codes`: QR listeleme, detay, scan log, activate/deactivate ve QR olusturma.
- `locations`: Kurum bazli lokasyon agaci ve lokasyon olusturma.
- `organizations`: Admin kurum yonetimi ve kuruma bagli task/QR/lokasyon sorgulari.
- `users`: Admin kullanici yonetimi.
- `notifications`: Telegram bildirimi ve webhook cevabi ile task tamamlama.
- `prisma`: Prisma client lifecycle.
- `health`: Health check.

**Web modulleri**

- `pages/q/[token].vue`: Ziyaretci/hasta public talep ekrani.
- `pages/login.vue`: Admin/supervisor/staff login.
- `pages/admin/tasks`: Task listesi ve detay akisi.
- `pages/admin/qrs`: QR listesi, detay ve QR yonetimi.
- `pages/admin/locations`: Lokasyon agaci.
- `pages/admin/organizations`: Kurum ve Telegram ayarlari.
- `pages/admin/users.vue`: Kullanici yonetimi.
- `composables/useApi.ts`: API client yardimcisi.
- `composables/useAuth.ts`: Web auth state ve token yonetimi.

**Mobile modulleri**

- `src/navigation`: Auth stack, app tab navigator ve profil stack akisi.
- `src/screens/auth`: Login.
- `src/screens/tasks`: Task listesi ve detay.
- `src/screens/qrs`: QR listesi ve detay.
- `src/screens/locations`: Lokasyon agaci.
- `src/screens/organizations`: Kurum ozeti ve yonetim ekranlari.
- `src/screens/users`: Admin kullanici yonetimi.
- `src/screens/profile`: Profil ve cikis.
- `src/store/authStore.ts`: Zustand auth store.
- `src/api`: Auth, task, QR ve admin API client fonksiyonlari.

## Veritabani, Migration ve Seed

Veritabani Prisma ile yonetilir. Ana schema:

```text
apps/api/prisma/schema.prisma
```

Temel modeller:

- `Organization`
- `User`
- `Location`
- `QrCode`
- `VisitorRequest`
- `RequestMedia`
- `Task`
- `TaskHistory`
- `QrScanLog`

Enumlar:

- `OrganizationType`: `HOSPITAL`, `CLINIC`, `HOTEL`, `RESTAURANT`, `GENERAL`
- `LocationType`: `ORGANIZATION`, `FLOOR`, `ROOM`, `AREA`
- `RequestChannel`: `QR_WEB`
- `TaskStatus`: `NEW`, `IN_PROGRESS`, `DONE_WAITING_APPROVAL`, `APPROVED`, `REJECTED`
- `QrScanStatus`: `RESOLVED`, `INACTIVE`, `TOKEN_NOT_FOUND`, `REQUEST_CREATED`, `REQUEST_FAILED`
- `RequestMediaType`: `IMAGE`, `AUDIO`
- `Role`: `ADMIN`, `SUPERVISOR`, `STAFF`

Migration klasoru:

```text
apps/api/prisma/migrations/
```

Mevcut migrationlar:

- `20260419000000_init`
- `20260419000100_add_task_reject_metadata`
- `20260420000000_qr_metadata_and_scan_logs`
- `20260420010000_request_media_uploads`
- `20260421000000_auth_users`
- `20260424000000_multi_organization`
- `20260427000000_organization_telegram_settings`

Prisma komutlari:

```bash
pnpm prisma:generate
pnpm prisma:migrate
pnpm prisma:deploy
pnpm prisma:seed
```

Seed dosyasi:

```text
apps/api/prisma/seed.ts
```

Seed iki demo kurum olusturur:

- `Ozel Hastane A`
- `Ozel Hastane B`

Her kurum icin root lokasyon, katlar, odalar ve QR tokenlari uretilir.

Demo kullanicilar:

| Rol | Email | Sifre |
| --- | --- | --- |
| Admin | `admin@example.com` | `Admin123!` |
| Hastane A Supervisor | `supervisor.a@example.com` | `Admin123!` |
| Hastane A Staff | `staff.a@example.com` | `Admin123!` |
| Hastane B Supervisor | `supervisor.b@example.com` | `Admin123!` |
| Hastane B Staff | `staff.b@example.com` | `Admin123!` |

Demo public QR URL ornekleri:

- `http://localhost:3000/q/room-401-demo-token`
- `http://localhost:3000/q/room-402-demo-token`
- `http://localhost:3000/q/hsp-a-f1-r101-demo`
- `http://localhost:3000/q/hsp-b-f1-r101-demo`

## API Endpointleri ve Temel Akislar

Tum korumali endpointlerde header:

```http
Authorization: Bearer <accessToken>
```

### Public endpointler

| Method | Endpoint | Aciklama |
| --- | --- | --- |
| `GET` | `/health` | API health check |
| `GET` | `/public/qr/:token` | QR token cozer, lokasyon ve kurum bilgisini dondurur |
| `POST` | `/public/requests` | Ziyaretci/hasta talebi olusturur, task uretir |
| `POST` | `/telegram/webhook` | Opsiyonel Telegram webhook cevabini isler |

`POST /public/requests` form-data ile `images`, `image` ve `audio` upload alanlarini destekler.

### Auth endpointleri

| Method | Endpoint | Aciklama |
| --- | --- | --- |
| `POST` | `/auth/login` | Email/sifre ile access token alir |
| `GET` | `/auth/me` | Aktif kullanici, rol ve organization bilgisini dondurur |

### Task endpointleri

| Method | Endpoint | Roller | Aciklama |
| --- | --- | --- | --- |
| `GET` | `/tasks` | ADMIN, SUPERVISOR, STAFF | Task listesi |
| `GET` | `/tasks/:id` | ADMIN, SUPERVISOR, STAFF | Task detay |
| `PATCH` | `/tasks/:id/start` | ADMIN, SUPERVISOR, STAFF | Task'i `IN_PROGRESS` yapar |
| `PATCH` | `/tasks/:id/complete` | ADMIN, SUPERVISOR, STAFF | Task'i `DONE_WAITING_APPROVAL` yapar |
| `PATCH` | `/tasks/:id/approve` | ADMIN, SUPERVISOR | Task'i onaylar |
| `PATCH` | `/tasks/:id/reject` | ADMIN, SUPERVISOR | Task'i reddeder |

`ADMIN` icin opsiyonel query:

```text
GET /tasks?organizationId=<orgId>
```

### QR endpointleri

| Method | Endpoint | Roller | Aciklama |
| --- | --- | --- | --- |
| `GET` | `/qr-codes` | ADMIN, SUPERVISOR | QR listesi |
| `GET` | `/qr-codes/:id` | ADMIN, SUPERVISOR | QR detay |
| `GET` | `/qr-codes/:id/scan-logs` | ADMIN, SUPERVISOR | QR scan loglari |
| `POST` | `/qr-codes` | ADMIN, SUPERVISOR | QR olusturur |
| `PATCH` | `/qr-codes/:id/activate` | ADMIN, SUPERVISOR | QR aktif eder |
| `PATCH` | `/qr-codes/:id/deactivate` | ADMIN, SUPERVISOR | QR pasif eder |

`ADMIN` icin opsiyonel query:

```text
GET /qr-codes?organizationId=<orgId>
```

### Lokasyon endpointleri

| Method | Endpoint | Roller | Aciklama |
| --- | --- | --- | --- |
| `GET` | `/locations/tree` | ADMIN, SUPERVISOR | Lokasyon agaci |
| `POST` | `/locations` | ADMIN, SUPERVISOR | Lokasyon olusturur |

`ADMIN` icin opsiyonel query:

```text
GET /locations/tree?organizationId=<orgId>
```

### Kurum endpointleri

Sadece `ADMIN`:

| Method | Endpoint | Aciklama |
| --- | --- | --- |
| `GET` | `/organizations` | Kurum listesi |
| `POST` | `/organizations` | Kurum olusturur, root lokasyonu da acar |
| `GET` | `/organizations/:id` | Kurum detay |
| `PATCH` | `/organizations/:id` | Kurum ve Telegram ayarlarini gunceller |
| `GET` | `/organizations/:id/locations/tree` | Kurum lokasyon agaci |
| `GET` | `/organizations/:id/qrs` | Kurum QR listesi |
| `GET` | `/organizations/:id/tasks` | Kurum task listesi |

### Kullanici endpointleri

Sadece `ADMIN`:

| Method | Endpoint | Aciklama |
| --- | --- | --- |
| `GET` | `/users` | Kullanici listesi |
| `POST` | `/users` | Kullanici olusturur |
| `PATCH` | `/users/:id` | Kullanici gunceller |

Opsiyonel query:

```text
GET /users?organizationId=<orgId>
```

## Temel Kullanici Akislari

**Public talep akisi**

1. Kullanici `http://localhost:3000/q/<token>` adresini acar.
2. Web, API'den `/public/qr/:token` ile QR ve lokasyon bilgisini alir.
3. Kullanici talep metni ve opsiyonel medya ile formu gonderir.
4. API `VisitorRequest`, `Task`, `TaskHistory` ve `QrScanLog` kayitlarini olusturur.
5. Kurumda Telegram aktifse bildirim gonderilir.

**Staff task akisi**

1. Staff web'e giris yapar.
2. Sadece kendi kurumundaki tasklari gorur.
3. Task'i baslatir.
4. Isi tamamlayinca task `DONE_WAITING_APPROVAL` durumuna gecer.

**Supervisor onay akisi**

1. Supervisor web veya mobile'da kendi kurum tasklarini gorur.
2. Tamamlanan tasklari onaylar veya reddeder.
3. Reddedilen taskta not bilgisi tutulabilir.

**Admin yonetim akisi**

1. Admin web veya mobile'da global gorunum alir.
2. Kurum, lokasyon, QR ve kullanici kayitlarini yonetir.
3. Web admin panelinde kurum secici ile tek kuruma filtreleyebilir.

## Telegram Bildirimleri

Yeni public QR talebi olustugunda API, kurumun Telegram ayarlari aktifse Telegram Bot API `sendMessage` endpoint'i ile mesaj gonderir.

Kurum bazli alanlar:

- `telegramEnabled`
- `telegramChatId`
- `telegramNotificationThreadId`

Env bazli alanlar:

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_WEBHOOK_SECRET`
- `ADMIN_WEB_BASE_URL`

Webhook ile bot mesajina `yapildi` cevabi verilirse ilgili task `DONE_WAITING_APPROVAL` durumuna alinabilir. Telegram hatalari ana public request akisini bozmaz, hata API loglarina yazilir.

Webhook kurulum ornegi:

```text
https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook?url=<API_PUBLIC_URL>/telegram/webhook
```

Secret kullaniliyorsa:

```text
https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook?url=<API_PUBLIC_URL>/telegram/webhook&secret_token=<TELEGRAM_WEBHOOK_SECRET>
```

## Test, Build ve Deploy Komutlari

### Build

Tum workspace:

```bash
pnpm build
```

Tek tek:

```bash
pnpm build:api
pnpm build:web
pnpm build:mobile
```

Mobile TypeScript kontrolu:

```bash
pnpm --filter @lbrtw/mobile build
```

### Test

Repoda su an otomatik test script'i bulunmuyor. Degisikliklerden sonra minimum dogrulama icin:

```bash
pnpm build:api
pnpm build:web
pnpm build:mobile
```

Manuel smoke test:

1. `docker compose --env-file .env -f infra/docker-compose.yml up -d`
2. `pnpm prisma:deploy`
3. `pnpm prisma:seed`
4. `pnpm dev`
5. `http://localhost:3000/q/room-401-demo-token` ile public talep olustur.
6. `admin@example.com / Admin123!` ile web admin paneline gir.
7. Task'in olustugunu kontrol et.
8. `supervisor.a@example.com / Admin123!` ile mobile girip Hastane A tasklarini kontrol et.

### Production start

API:

```bash
pnpm start:api
```

Web:

```bash
pnpm start:web
```

Production migration:

```bash
pnpm prisma:migrate:deploy
```

### Render deploy

Repo kokunde `render.yaml` bulunur.

Render servisleri:

- `lbrtw-api-staging`
- `lbrtw-web-staging`
- `lbrtw-postgres-staging`

Blueprint komutlari:

- API build: `corepack enable && pnpm install --frozen-lockfile && pnpm build:api`
- API pre-deploy: `pnpm prisma:migrate:deploy`
- API start: `pnpm start:api`
- Web build: `corepack enable && pnpm install --frozen-lockfile && pnpm build:web`
- Web start: `pnpm start:web`

Render free planda `preDeployCommand` calismayabilir. Bu durumda migration komutunu manuel calistir:

```bash
pnpm prisma:migrate:deploy
```

## Sik Karsilasilan Durumlar

**`localhost:3001` ana sayfasi 404 donuyor**

Normaldir. API root endpoint'i yok. Health kontrolu:

```text
http://localhost:3001/health
```

**Fiziksel telefonda API'ye baglanmiyor**

`EXPO_PUBLIC_API_BASE_URL` icinde `localhost` yerine bilgisayarin local IP adresini kullan.

**CORS hatasi**

Production veya farkli domain kullanirken API env'ine web origin'ini ekle:

```env
CORS_ORIGIN=https://web-domain.example
```

**Migration database'e baglanamiyor**

Docker container'i kontrol et:

```bash
docker compose --env-file .env -f infra/docker-compose.yml ps
```

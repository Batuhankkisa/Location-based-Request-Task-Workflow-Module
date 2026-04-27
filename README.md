# Location-based-Request-Task-Workflow-Module

QR okutuldugunda public kullanicinin lokasyona bagli talep actigi, talebin otomatik task'a donustugu ve personel tarafinin JWT ile korundugu NestJS + Nuxt monorepo.

Sistem artik tek-hastane demo degil; `Organization` modeli ile multi-organization / multi-tenant calisir.

## Yapi

```text
/
  apps/
    api/        NestJS API, Prisma schema, migrations, seed
    web/        Nuxt web uygulamasi
    mobile/     Expo / React Native uygulamasi
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
- Mobile: Expo, React Native, Zustand
- Auth: JWT access token + role-based authorization
- Password hashing: bcryptjs

## Multi-organization modeli

Yeni ust seviye tenant modeli `Organization`.

Alanlar:

- `id`
- `name`
- `code`
- `type`
- `isActive`
- `telegramEnabled`
- `telegramChatId`
- `telegramNotificationThreadId`
- `createdAt`
- `updatedAt`

Desteklenen `OrganizationType` degerleri:

- `HOSPITAL`
- `CLINIC`
- `HOTEL`
- `RESTAURANT`
- `GENERAL`

## Veri modeli

### Organization

Her kurum icin ayri bir kayit tutulur.

### Location

`Location` kayitlari artik `organizationId` tasir.
Mevcut parent-child agaci korunur.

Bu repoda uyumluluk icin kurumun root lokasyonu da tutulur:

- `Organization`
  - root `Location` (`type=ORGANIZATION`)
    - `FLOOR`
      - `ROOM`

Bu sayede eski lokasyon agaci ve public QR akisinin davranisi bozulmadan tenant modeli eklenmis olur.

### QrCode

QR kayitlari organization'a `location.organizationId` uzerinden baglanir.
`token` global unique kalir; boylece public `/q/:token` ve `/public/qr/:token` akisi degismez.

### User

MVP icin ayrik membership tablosu yerine `User.organizationId` yaklasimi secildi.

Gerekce:

- mevcut role modeli zaten tek kullanicili basit akisa sahip
- `ADMIN` global kalabiliyor
- `SUPERVISOR` ve `STAFF` icin tek organization scope yeterli
- mobile ve auth contract'ini minimum degisiklikle koruyor

Kural:

- `ADMIN`: `organizationId = null` olabilir, global erisimlidir
- `SUPERVISOR` ve `STAFF`: aktif bir organization'a bagli olmalidir

## Roller ve scope kurallari

- `ADMIN`
  - tum organizationlari gorur
  - organization olusturur/gunceller
  - tum task, QR, location ve user kayitlarini gorur
  - `organizationId` query param'i ile kuruma gore filtreleyebilir
- `SUPERVISOR`
  - sadece kendi organization'indaki tasklari gorur
  - sadece kendi organization'indaki QR kayitlarini gorur
  - sadece kendi organization'indaki location agacini gorur
  - `approve` ve `reject` yapabilir
- `STAFF`
  - sadece kendi organization'indaki tasklari gorur
  - `start` ve `complete` yapabilir
  - QR yonetimi yapamaz

Detay endpointlerinde baska organization verisine erisim denemeleri `404` ile kapatilir; boylece veri sizmasi olmaz.

## Public akis

Public akislar degismedi:

- `GET /public/qr/:token`
- `POST /public/requests`
- Nuxt public sayfasi: `/q/[token]`

Token cozulurken su zincir kullanilir:

- `QrCode`
- `Location`
- `Organization`

QR veya organization pasifse public akis ayni sekilde "bulunamadi / pasif" davranisiyla kapanir.

## API yuzeyi

### Public kalan route'lar

- `GET /health`
- `GET /public/qr/:token`
- `POST /public/requests`

### Auth route'lari

- `POST /auth/login`
- `GET /auth/me`

`/auth/me` ve login response'u artik organization ozetini de doner:

- `organizationId`
- `organization`

### Task route'lari

- `GET /tasks`
- `GET /tasks/:id`
- `PATCH /tasks/:id/start`
- `PATCH /tasks/:id/complete`
- `PATCH /tasks/:id/approve`
- `PATCH /tasks/:id/reject`

`ADMIN` icin opsiyonel query:

- `GET /tasks?organizationId=<orgId>`

### QR route'lari

- `GET /qr-codes`
- `GET /qr-codes/:id`
- `GET /qr-codes/:id/scan-logs`
- `POST /qr-codes`
- `PATCH /qr-codes/:id/activate`
- `PATCH /qr-codes/:id/deactivate`

`ADMIN` icin opsiyonel query:

- `GET /qr-codes?organizationId=<orgId>`

### Location route'lari

- `GET /locations/tree`
- `POST /locations`

`ADMIN` icin opsiyonel query:

- `GET /locations/tree?organizationId=<orgId>`

`POST /locations` artik `organizationId` alabilir. `parentId` verilirse organization parent'tan turetilir.

### User route'lari

- `GET /users`
- `POST /users`
- `PATCH /users/:id`

`ADMIN`, kullanicilari organization'a baglayabilir veya global admin yapabilir.

Opsiyonel query:

- `GET /users?organizationId=<orgId>`

### Organization yonetim route'lari

Sadece `ADMIN`:

- `GET /organizations`
- `POST /organizations`
- `GET /organizations/:id`
- `PATCH /organizations/:id`
- `GET /organizations/:id/locations/tree`
- `GET /organizations/:id/qrs`
- `GET /organizations/:id/tasks`

`POST /organizations` yeni kurumla birlikte root organization lokasyonunu da olusturur.

## Seed verisi

Seed artik en az iki organization kurar:

- `Ozel Hastane A`
- `Ozel Hastane B`

Her organization icin:

- root organization lokasyonu
- katlar
- odalar
- QR tokenlari

Eski demo tokenlari korunur:

- `room-401-demo-token`
- `room-402-demo-token`
- `hsp-a-*`

Yeni Hastane B token ornekleri:

- `hsp-b-f1-r101-demo`
- `hsp-b-f1-r102-demo`
- `hsp-b-f2-r201-demo`

## Demo kullanicilar

Seed ile uretilir:

- `admin@example.com / Admin123!` -> global admin
- `supervisor.a@example.com / Admin123!` -> Hastane A supervisor
- `staff.a@example.com / Admin123!` -> Hastane A staff
- `supervisor.b@example.com / Admin123!` -> Hastane B supervisor
- `staff.b@example.com / Admin123!` -> Hastane B staff

Eski tek-kurum demo kullanicilarindan `supervisor@example.com` ve `staff@example.com` varsa seed bunlari scoped `.a` kullanicilarina tasimaya calisir.

## Web davranisi

Admin ekranlari organization-aware olacak sekilde guncellendi:

- `/admin/tasks`
- `/admin/qrs`
- `/admin/locations`
- `/admin/organizations`

Davranis:

- `ADMIN`: organization secici gorur, tum kurumlar veya tek kurum bazli calisabilir
- `SUPERVISOR` / `STAFF`: sadece kendi kurumunu gorur
- detay ekranlari organization context'ini gosterir

## Mobile davranisi

Mobile tarafinda endpoint path'leri ayni kalir:

- `/tasks`
- `/tasks/:id`
- `/qr-codes`
- `/qr-codes/:id`

Ek organization secimi gerekmez.
Login olan kullanici backend scope'u sayesinde kendi organization verisini gorur.

## Telegram bildirimleri

Yeni public QR talebi olustugunda API, ilgili kurumun Telegram ayarlari aktifse Telegram Bot API `sendMessage` endpoint'i ile metin mesaji gonderir.

Davranis:

- bot token tek merkezidir ve sadece env'den okunur: `TELEGRAM_BOT_TOKEN`
- chat ayari organization seviyesindedir: `telegramEnabled`, `telegramChatId`, `telegramNotificationThreadId`
- `telegramNotificationThreadId` forum/topic kullanan Telegram gruplari icin opsiyoneldir
- Telegram hatasi ana akis icin fail sayilmaz; request, task, task history, media ve scan log kayitlari korunur
- hata API loglarina yazilir

Mesaj icerigi:

- organization adi
- lokasyon path'i
- talep metni
- transcript varsa kisa hali
- request zamani
- task status
- task id
- `ADMIN_WEB_BASE_URL` tanimliysa admin task detay linki

Kurulum:

1. Telegram'da BotFather ile yeni bot olustur ve token al.
2. Botu hedef Telegram grubuna ekle.
3. Grup mesajlarini okuyabilmesi icin gerekiyorsa BotFather uzerinden privacy mode'u kapat.
4. Grubun `chat_id` degerini al. Supergroup ID'leri genelde `-100...` ile baslar.
5. Admin web'de `/admin/organizations` ekranindan ilgili kurum icin `Telegram bildirimi gonder` secenegini ac, `Chat ID` alanini doldur ve kaydet.
6. Forum topic kullaniyorsan `Topic ID` alanina Telegram `message_thread_id` degerini gir.

## Prisma ve migration

Onemli schema degisiklikleri:

- yeni `Organization` modeli
- yeni `OrganizationType` enum
- `Organization.telegramEnabled`
- `Organization.telegramChatId`
- `Organization.telegramNotificationThreadId`
- `Location.organizationId`
- `User.organizationId`
- `Location` icin `@@unique([organizationId, code])`

Yeni migration:

- `apps/api/prisma/migrations/20260424000000_multi_organization`
- `apps/api/prisma/migrations/20260427000000_organization_telegram_settings`

Migration, mevcut tek-kurum root lokasyonlardan organization kaydi uretir ve eski location agacini `organizationId` ile backfill eder.
Telegram migration'i mevcut organization kayitlarina varsayilan kapali bildirim ayarlarini ekler.

## Lokal kurulum

Windows PowerShell `pnpm.ps1` policy sorunu varsa `pnpm` yerine `pnpm.cmd` kullan.

```powershell
pnpm.cmd install
Copy-Item .env.example .env
```

Gerekli env ornegi:

```text
DATABASE_URL=postgresql://workflow:workflow@localhost:5432/workflow?schema=public
API_PORT=3001
NUXT_PUBLIC_API_BASE_URL=http://localhost:3001
JWT_SECRET=change-me-for-production
JWT_EXPIRES_IN=1d
TELEGRAM_BOT_TOKEN=
ADMIN_WEB_BASE_URL=http://localhost:3000
```

## Lokal database ve seed

Docker ile local PostgreSQL kaldirmak icin:

```powershell
docker compose --env-file .env -f infra/docker-compose.yml up -d
```

Sonra:

```powershell
pnpm.cmd prisma:migrate:deploy
pnpm.cmd prisma:seed
```

## Calistirma

Tum workspace:

```powershell
pnpm.cmd dev
```

Ayrik:

```powershell
pnpm.cmd dev:api
pnpm.cmd dev:web
pnpm.cmd dev:mobile
```

Adresler:

- Web: `http://localhost:3000`
- API: `http://localhost:3001`
- Health: `http://localhost:3001/health`

## Lokal test akisi

1. `docker compose --env-file .env -f infra/docker-compose.yml up -d`
2. `pnpm.cmd prisma:migrate:deploy`
3. `pnpm.cmd prisma:seed`
4. `pnpm.cmd dev`
5. `http://localhost:3000/q/room-401-demo-token` ile Hastane A public akisini dene
6. `http://localhost:3000/q/hsp-b-f1-r101-demo` ile Hastane B public akisini dene
7. `staff.a@example.com / Admin123!` ile giris yap, sadece Hastane A tasklarini gordugunu kontrol et
8. `staff.b@example.com / Admin123!` ile giris yap, sadece Hastane B tasklarini gordugunu kontrol et
9. `supervisor.a@example.com` ile Hastane A tasklari icin `approve/reject` dene
10. `admin@example.com` ile `/admin/organizations`, `/admin/tasks`, `/admin/qrs`, `/admin/locations` ekranlarinda organization seciciyi test et
11. Telegram testi icin `.env` icinde `TELEGRAM_BOT_TOKEN` ve `ADMIN_WEB_BASE_URL` tanimla
12. `/admin/organizations` ekraninda test kurumuna `telegramChatId` bagla ve Telegram'i aktif et
13. `http://localhost:3000/q/room-401-demo-token` uzerinden talep olustur; talep/task olusurken Telegram grubuna mesaj dustugunu kontrol et

## Staging / Render test akisi

1. Render Postgres'i ayakta tut
2. API servisinde `TELEGRAM_BOT_TOKEN` secret env degerini tanimla
3. API servisinde `ADMIN_WEB_BASE_URL` degerini web servis URL'i yap
4. API deploy oncesi `pnpm prisma:migrate:deploy` calistir
5. `pnpm prisma:seed` ile staging verisini yukle
6. `admin@example.com` ile login olup organization ekranindan kayitlari kontrol et
7. Test organization'ina Telegram chat id bagla ve bildirimi aktif et
8. Public QR testlerini her iki organization tokeni ile dogrula

## Derleme dogrulamasi

Kod degisikligi sonrasi lokal olarak dogrulananlar:

- `pnpm.cmd --filter @lbrtw/api build`
- `pnpm.cmd --filter @lbrtw/web build`
- `pnpm.cmd --filter @lbrtw/mobile build`

Not:

- Bu oturumda local PostgreSQL ayakta olmadigi icin `pnpm.cmd prisma:migrate:deploy` komutu uygulanamadi
- migration dosyasi repo icine eklendi; database ayaga kalktiginda ayni komutla test edebilirsin

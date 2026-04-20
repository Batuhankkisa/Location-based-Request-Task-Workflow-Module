# Location-based-Request-Task-Workflow-Module

QR okutulduğunda public kullanıcının lokasyona bağlı talep açtığı, talebin otomatik taska dönüştüğü ve operasyon/amirin task akışını yönettiği hızlı MVP.

> Güvenlik notu: Admin/staff ekranlarında auth yoktur. Bu repo şu haliyle staging/demo içindir. Production kullanımı için admin/staff auth, yetkilendirme, rate limit ve audit kontrolleri eklenmelidir.

## Klasör Yapısı

```text
/
  apps/
    api/        NestJS API, Prisma schema, migration ve seed
    web/        Nuxt web uygulaması
  packages/
    shared/     Ortak enum ve tipler
  infra/
    docker-compose.yml
  render.yaml   Render staging Blueprint örneği
  .env.example
  pnpm-workspace.yaml
  package.json
  README.md
```

## Teknolojiler

- Monorepo: pnpm workspace
- Frontend: Nuxt 3, Vue 3, TypeScript
- Backend: NestJS, TypeScript
- ORM: Prisma
- DB: PostgreSQL
- Infra hazırlığı: Redis
- Notification: adapter yapısı, `ConsoleNotificationProvider`
- Shared package: `TaskStatus`, `LocationType`, `RequestChannel`

## Lokal Kurulum

Windows PowerShell `pnpm.ps1` execution policy hatası verirse komutlarda `pnpm` yerine `pnpm.cmd` kullan.

```bash
pnpm install
cp .env.example .env
```

Windows PowerShell:

```powershell
pnpm.cmd install
Copy-Item .env.example .env
```

Nuxt web tarafı Windows/OneDrive altında daha stabil çalışması için Nuxt 3.15.1/Vite 6 hattına sabitlenmiştir ve dev script’i `nuxi dev --no-fork` kullanır. Eski kurulumdan gelen `.nuxt`, `.output` veya `node_modules` klasörleri varsa temiz kurulum önerilir.

## Docker Compose

Docker Desktop çalışır durumda olmalı.

```bash
docker compose --env-file .env -f infra/docker-compose.yml up -d
```

Bu komut PostgreSQL `5432`, Redis `6379` portlarını açar.

## Prisma

Lokal geliştirme için:

```bash
pnpm prisma:generate
pnpm prisma:migrate
pnpm prisma:seed
```

Staging/production deploy için migration komutu:

```bash
pnpm prisma:migrate:deploy
```

`prisma migrate deploy`, mevcut migration dosyalarını hedef veritabanına uygular. Staging/production ortamında `prisma migrate dev` kullanılmamalıdır.

Seed her deploy’da otomatik koşmamalıdır. İlk staging kurulumu veya demo datasını yenilemek gerektiğinde manuel çalıştır:

```bash
pnpm prisma:seed
```

Seed tekrar çalıştırılabilir. Demo verileri:

- Özel Hastane A
- 1. Kat: 101, 102, 103 No’lu Odalar
- 2. Kat: 201, 202, 203 No’lu Odalar
- 3. Kat: 301, 302, 303 No’lu Odalar
- 4. Kat: 401, 402 No’lu Odalar
- Yeni token formatı: `hsp-a-f1-r101-demo`, `hsp-a-f2-r201-demo`, `hsp-a-f3-r301-demo`
- Geriye dönük uyum için korunan tokenlar: `room-401-demo-token`, `room-402-demo-token`

## Uygulamaları Çalıştırma

```bash
pnpm dev
```

Ayrı ayrı çalıştırmak için:

```bash
pnpm dev:api
pnpm dev:web
```

Varsayılan adresler:

- Web: `http://localhost:3000`
- API: `http://localhost:3001`
- Health: `http://localhost:3001/health`

## Build ve Start Komutları

Root workspace üzerinden çalıştır:

```bash
pnpm build:api
pnpm start:api

pnpm build:web
pnpm start:web
```

API production start komutu `apps/api/dist/main.js` dosyasını çalıştırır. Web production start komutu Nuxt/Nitro çıktısı olan `apps/web/.output/server/index.mjs` dosyasını çalıştırır.

## Render Staging Deploy

Render için iki ayrı Web Service ve bir Render Postgres kullanılacak:

- API service: `lbrtw-api-staging`
- Web service: `lbrtw-web-staging`
- Postgres: `lbrtw-postgres-staging`

Repo kökündeki `render.yaml` bu staging yapısı için Blueprint örneğidir. Service isimlerini değiştirirsen `CORS_ORIGIN` ve `NUXT_PUBLIC_API_BASE_URL` değerlerini de yeni `.onrender.com` URL’lerine göre güncelle.

Render monorepo notu: API ve Web service için Root Directory alanını `apps/api` veya `apps/web` yapma. Bu repo `packages/shared` workspace paketine bağlı olduğu için komutlar repo root’undan çalışmalıdır. Render’da root directory boş bırakılırsa repo kökü kullanılır.

Render dokümanları:

- Monorepo ve root directory: https://render.com/docs/monorepo-support
- Blueprint `render.yaml`: https://render.com/docs/blueprint-spec
- Deploy build/pre-deploy/start akışı: https://render.com/docs/deploys
- Web service port/host beklentisi: https://render.com/docs/web-services

### Render Postgres

1. Render Dashboard’da yeni PostgreSQL oluştur veya `render.yaml` Blueprint ile `lbrtw-postgres-staging` oluştur.
2. API service env’ine `DATABASE_URL` olarak Render Postgres internal connection string ver.
3. İlk deploy öncesi veya deploy sırasında migration için `pnpm prisma:migrate:deploy` çalıştır.
4. Demo dataya ihtiyacın varsa migration sonrası `pnpm prisma:seed` komutunu bir kez manuel çalıştır.

Free Postgres demo için uygundur ama süre, kapasite ve backup limitleri vardır. Staging verisini korumak istiyorsan paid plan kullan.

### API Service

Render Web Service oluştururken:

- Root Directory: boş bırak, repo root kullanılsın
- Runtime: Node
- Build Command: `corepack enable && pnpm install --frozen-lockfile && pnpm build:api`
- Pre-Deploy Command: `pnpm prisma:migrate:deploy`
- Start Command: `pnpm start:api`
- Health Check Path: `/health`

API env değişkenleri:

```text
DATABASE_URL=<Render Postgres internal connection string>
CORS_ORIGIN=https://lbrtw-web-staging.onrender.com
NODE_ENV=production
```

Render `PORT` değerini otomatik verir. API bootstrap sırası `process.env.PORT || process.env.API_PORT || 3001` şeklindedir ve `0.0.0.0` host’unda dinler.

Pre-Deploy Command, Render’da paid web service tarafında desteklenir. Free service ile ilerliyorsan migration komutunu deploy öncesinde manuel çalıştırman gerekir.

### Web Service

Render Web Service oluştururken:

- Root Directory: boş bırak, repo root kullanılsın
- Runtime: Node
- Build Command: `corepack enable && pnpm install --frozen-lockfile && pnpm build:web`
- Start Command: `pnpm start:web`

Web env değişkenleri:

```text
NUXT_PUBLIC_API_BASE_URL=https://lbrtw-api-staging.onrender.com
NODE_ENV=production
```

Nuxt tarafı API URL’ini `NUXT_PUBLIC_API_BASE_URL` üzerinden okur. Local fallback `http://localhost:3001` olarak kalır.

## Env Değişkenleri

`.env.example` local varsayılanları ve staging için gereken anahtarları gösterir. Gerçek staging değerleri Render Dashboard’dan girilmelidir.

Önemli değişkenler:

- `DATABASE_URL`: API için PostgreSQL connection string. Render’da internal connection string kullan.
- `REDIS_URL`: Şu an runtime için zorunlu değil, ileride queue/cache için ayrıldı.
- `API_PORT`: Local API fallback portu.
- `PORT`: Render tarafından otomatik verilir; localde genellikle boş bırakılır.
- `CORS_ORIGIN`: Browser’dan API’ye izin verilecek web origin’i. Staging’de web public URL’i olmalı.
- `NUXT_PUBLIC_API_BASE_URL`: Web’in browser tarafında kullanacağı public API URL’i.

## QR ve Demo Akışı

Public QR sayfası Nuxt route olarak `/q/[token]` üstünden çalışır. Sayfa API tarafında `GET /public/qr/:token` ile token çözer, talep gönderirken `POST /public/requests` endpoint’ini kullanır.

Lokal test:

1. `http://localhost:3000/q/room-401-demo-token` adresini aç.
2. Talep metni gir: `Havlu istiyorum`.
3. `Talebi gönder` butonuna bas.
4. `http://localhost:3000/admin/tasks` sayfasında yeni taskı gör.
5. Task detayında sırasıyla `Başlat`, `Tamamla`, `Onayla` akışını çalıştır.

Staging test:

1. `https://lbrtw-api-staging.onrender.com/health` adresinden API health kontrolü yap.
2. `https://lbrtw-web-staging.onrender.com/q/room-401-demo-token` adresini telefonda aç.
3. Talep oluştur.
4. `https://lbrtw-web-staging.onrender.com/admin/tasks` sayfasında taskı kontrol et.
5. Task detayına girip state geçişlerini test et.

`room-401-demo-token` staging’de çalışması için staging veritabanında seed çalışmış olmalıdır.

## QR Yönetimi ve Loglama

`QrCode` modeli QR yönetimi için metadata tutar: aktif/pasif durum, pasife alma zamanı, son okutulma zamanı, toplam okutulma sayısı, görsel yolu ve opsiyonel not. QR görsel binary’si DB’ye yazılmaz.

Her QR çözümleme denemesi `QrScanLog` kaydına düşer. Log; token snapshot, okutulma zamanı, IP, user agent, çözülen lokasyon, durum, varsa oluşan `VisitorRequest` ve `Task` bağlantılarını tutar. Geçersiz token da `TOKEN_NOT_FOUND` olarak loglanır. Pasif QR okutulursa `INACTIVE` loglanır ve public API `404` döner.

QR görsel yolu konvansiyonu:

```text
/qr-assets/{token}.png
```

MVP için en pratik saklama yeri `apps/web/public/qr-assets` klasörüdür. Bu klasöre koyulan dosyalar Nuxt tarafından `/qr-assets/...` public path’iyle servis edilir. Seed sadece `imagePath` metadata’sını üretir; fiziksel PNG üretimi bu sürümde zorunlu değildir.

Admin QR ekranları:

- `/admin/qrs`: QR listesi, lokasyon, token, aktiflik, scan count, son kullanım ve görsel path bilgisini gösterir.
- `/admin/qrs/[id]`: QR detayı, metadata, activate/deactivate aksiyonları ve son scan loglarını gösterir.

Normal public akışta `/q/[token]` açıldığında scan log oluşur, `scanCount` artar ve `lastScannedAt` güncellenir. Talep gönderilirse aynı scan log `REQUEST_CREATED` durumuna güncellenip request/task ile ilişkilendirilir.

## Voice-to-Text ve Request Media

Public QR ekranı `/q/[token]` üzerinden metin, transcript, ses kaydı ve fotoğraf gönderebilir. Tarayıcı destekliyorsa Web Speech API ile `transcriptText` üretilir; destek yoksa kullanıcı yine `MediaRecorder` ile ses kaydı alabilir veya transcript alanını elle doldurabilir.

`POST /public/requests` JSON akışını korur ve ayrıca `multipart/form-data` kabul eder:

- `token`: QR token
- `requestText`: kullanıcı talep metni, opsiyonel
- `transcriptText`: speech-to-text çıktısı veya elle girilen transcript, opsiyonel
- `scanLogId`: QR resolve sırasında dönen log id, opsiyonel
- `images`: çoklu fotoğraf dosyası
- `audio`: tek ses kaydı dosyası

Validasyon:

- Talep göndermek için `requestText`, `transcriptText`, ses kaydı veya fotoğraftan en az biri olmalıdır.
- Fotoğraf: `jpeg`, `png`, `webp`; dosya başına maksimum 5 MB; en fazla 5 adet.
- Ses: `webm`, `wav`, `mp3`, `ogg`, `m4a`, `aac`; maksimum 10 MB; en fazla 1 adet.
- Sadece fotoğraf veya sadece ses gönderilirse backend `requestText` için anlamlı bir fallback metin üretir.

Upload storage:

- Kullanıcı dosyaları DB’ye binary olarak yazılmaz.
- Varsayılan klasör: `apps/api/storage/uploads/request-media`.
- API bu klasörü `/uploads/request-media/...` path’iyle servis eder.
- DB’de `VisitorRequest.transcriptText`, `VisitorRequest.audioFileUrl` ve `RequestMedia.fileUrl` / metadata alanları tutulur.
- Farklı ortamda klasör değiştirmek için API env’ine `UPLOAD_DIR` verilebilir.

Render notu: Bu MVP local disk kullanır. Render free/ephemeral disk yeniden deploy veya restart sonrası dosyaları kalıcı tutmayabilir. Staging demo için yeterlidir; production için Render persistent disk veya S3/R2 benzeri object storage’a geçilmelidir.

Admin tarafında `/admin/tasks/[id]` ekranı transcript, audio player, fotoğraf galeri önizlemesi ve medya metadata tablosunu gösterir. Medya yoksa ekranda boş durum mesajı görünür.

## API Endpointleri

Public:

- `GET /public/qr/:token`
- `POST /public/requests`

Staff/Admin:

- `GET /tasks`
- `GET /tasks/:id`
- `PATCH /tasks/:id/start`
- `PATCH /tasks/:id/complete`
- `PATCH /tasks/:id/approve`
- `PATCH /tasks/:id/reject`

Admin:

- `GET /locations/tree`
- `POST /locations`
- `GET /qr-codes`
- `GET /qr-codes/:id`
- `GET /qr-codes/:id/scan-logs`
- `POST /qr-codes`
- `PATCH /qr-codes/:id/activate`
- `PATCH /qr-codes/:id/deactivate`

## Web Sayfaları

- `/`
- `/q/[token]`
- `/admin/tasks`
- `/admin/tasks/[id]`
- `/admin/locations`
- `/admin/qrs`
- `/admin/qrs/[id]`

## Notlar

- Pasif veya geçersiz QR token için API `404` döner.
- Boş talep; metin, transcript, ses veya fotoğraf yoksa `400` ile reddedilir.
- Hatalı task state geçişleri `400` ile reddedilir.
- Bulunamayan task için `404` döner.
- Browser speech recognition desteklemiyorsa QR ekranı transcript üretmez ama ses kaydı almayı dener.
- Admin/staff ekranları korumasızdır; staging/demo dışında kullanılmamalıdır.

# Location-based-Request-Task-Workflow-Module

QR okutulduğunda public kullanıcının lokasyona bağlı talep açtığı, talebin otomatik taska dönüştüğü ve operasyon/amirin task akışını yönettiği hızlı MVP.

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

```bash
pnpm prisma:generate
pnpm prisma:migrate
pnpm prisma:seed
```

Seed tekrar çalıştırılabilir. Demo verileri:

- Hastane A
- 3. Kat
- 401 No’lu Oda
- 402 No’lu Oda
- `room-401-demo-token`
- `room-402-demo-token`

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

Telefonla QR test ederken `localhost` kullanma. Telefon icin bilgisayarin ayni Wi-Fi/ag uzerindeki IPv4 adresini kullan:

```powershell
ipconfig
```

Ornek:

```env
API_HOST=0.0.0.0
NUXT_PUBLIC_API_BASE_URL=http://192.168.1.8:3001
```

Bu durumda telefonun acacagi QR URL'i:

```text
http://192.168.1.8:3000/q/room-401-demo-token
```

## Demo Akışı

1. `http://localhost:3000/q/room-401-demo-token` adresini aç.
2. Talep metni gir: `Havlu istiyorum`.
3. `Talebi gönder` butonuna bas.
4. API, `VisitorRequest`, `Task` ve ilk `TaskHistory` kaydını oluşturur.
5. API console log örneği: `New task created for 401 No’lu Oda: Havlu istiyorum`.
6. `http://localhost:3000/admin/tasks` sayfasında yeni taskı gör.
7. Task detayına gir.
8. Sırasıyla `Başlat`, `Tamamla`, `Onayla` akışını çalıştır.
9. Task detayındaki `Status history` alanında geçişleri kontrol et.

Red akışı için task `DONE_WAITING_APPROVAL` durumundayken `Reddet` kullanılabilir.

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
- `POST /qr-codes`

## Web Sayfaları

- `/`
- `/q/[token]`
- `/admin/tasks`
- `/admin/tasks/[id]`
- `/admin/locations`

## Notlar

- Pasif veya geçersiz QR token için API `404` döner.
- Boş talep metni `400` ile reddedilir.
- Hatalı task state geçişleri `400` ile reddedilir.
- Bulunamayan task için `404` döner.
- Public sayfadaki mikrofon butonu gerçek speech-to-text entegrasyonu değildir; sonraki sürüm için placeholder olarak durur.

# Supervisor/Admin Mobile App

Expo tabanli supervisor/admin mobil uygulamasi `apps/mobile` altindadir. Bu paket mevcut `apps/api` auth ve task/qr endpointlerini kullanacak sekilde hazirlandi.

## Kurulum

Monorepo kokunde:

```bash
pnpm install
```

## Env

`apps/mobile/.env.example` dosyasini `.env` olarak kopyala.

Windows PowerShell:

```powershell
Copy-Item apps/mobile/.env.example apps/mobile/.env
```

Gerekli degisken:

```env
EXPO_PUBLIC_API_BASE_URL=http://localhost:3001
```

## Calistirma

Monorepo kokunde:

```bash
pnpm dev:mobile
```

Alternatif:

```bash
pnpm --filter @lbrtw/mobile dev
```

iPhone Expo Go icin ag erisimi sorunluysa tunnel modunu kullan:

```bash
pnpm dev:mobile:tunnel
```

Expo CLI acildiginda:

- `a`: Android emulator
- `i`: iOS simulator
- `s`: Expo Go QR

## Local backend baglantisi

Simulator kullanirken:

```env
EXPO_PUBLIC_API_BASE_URL=http://localhost:3001
```

Fiziksel telefonda Expo Go ile test ederken `localhost` kullanma. Bilgisayarinin local IP adresini yaz:

```env
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.8:3001
```

Telefon ve bilgisayar ayni agda olmali. API `3001` portunda acik olmali.

## Expo Go ile test

1. Monorepo kokunde API'yi ac:

```bash
pnpm dev:api
```

2. Ikinci terminalde mobile uygulamayi ac:

```bash
pnpm dev:mobile
```

3. iPhone'da guncel Expo Go uygulamasini ac.
4. Aynı agdaysan QR kodu okut. LAN ile acilmazsa `pnpm dev:mobile:tunnel` kullan.
5. Login ekraninda demo kullanicilardan biriyle giris yap.

## iPhone notlari

- Expo Go surumun SDK 54 tabanli oldugu icin bu uygulama artik SDK 54 ile uyumludur.
- Fiziksel iPhone uzerinde backend icin `localhost` kullanma.
- `EXPO_PUBLIC_API_BASE_URL` degerini bilgisayarinin local IP adresiyle ayarla.
- API ve telefon ayni agda olmali.

## Ekranlar

- Login
- Gorev listesi
- Gorev detayi ve status aksiyonlari
- QR listesi
- QR detayi, scan loglari ve admin activate/deactivate aksiyonu
- Profil ve cikis

## Notlar

- Auth token `Expo SecureStore` icinde tutulur.
- App acilisinda token varsa `/auth/me` ile oturum hydrate edilir.
- Mobil uygulama girisi ADMIN ve SUPERVISOR rolleriyle sinirlidir.
- SUPERVISOR gorev onay/red aksiyonlarini ve QR modulunu gorur.
- ADMIN tum mobil modulleri ve QR activate/deactivate aksiyonlarini gorur.
- STAFF hesabi ile giris yapilirsa uygulama icerigi yerine yetki mesaji ve cikis aksiyonu gosterilir.

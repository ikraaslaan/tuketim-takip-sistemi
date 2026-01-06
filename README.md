# Tüketim Takip Sistemi

MERN Stack (MongoDB, Express, React, Node.js) ile geliştirilmiş mahalle bazlı tüketim takip sistemi.

## 🚀 Hızlı Başlangıç

### Tek Komutla Kurulum ve Çalıştırma

```bash
# 1. Tüm bağımlılıkları yükle
npm run install-all

# 2. Backend ve Frontend'i aynı anda başlat
npm start
```

Bu komutlar:
- Backend'i `http://localhost:5001` adresinde başlatır
- Frontend'i `http://localhost:3000` adresinde başlatır

**ÖNEMLİ:** İlk çalıştırmadan önce `.env` dosyalarını oluşturduğunuzdan emin olun (yukarıdaki "Ortam Değişkenlerini Ayarlama" bölümüne bakın).

## 📋 Detaylı Kurulum

### 1. Gereksinimler

- Node.js (v14 veya üzeri)
- npm veya yarn
- MongoDB Atlas hesabı (veya yerel MongoDB)

### 2. Ortam Değişkenlerini Ayarlama

#### Backend için:
`backend` klasöründe `.env.example` dosyasını kopyalayıp `.env` olarak kaydedin:

```bash
cd backend
cp .env.example .env
```

Sonra `.env` dosyasını düzenleyip MongoDB bağlantı bilgilerinizi girin:

```env
PORT=5001
MONGO_URI=mongodb+srv://kullanici:sifre@cluster.mongodb.net/tuketim_analizi_db?retryWrites=true&w=majority
```

#### Frontend için:
`frontend` klasöründe `.env.example` dosyasını kopyalayıp `.env` olarak kaydedin:

```bash
cd frontend
cp .env.example .env
```

Eğer backend farklı bir adreste çalışıyorsa (örneğin başka bir bilgisayarda), `.env` dosyasını düzenleyin:

```env
# Yerel bilgisayarda çalışıyorsa:
REACT_APP_API_URL=http://localhost:5001/api

# Başka bir bilgisayarda çalışıyorsa (IP adresini değiştirin):
REACT_APP_API_URL=http://192.168.1.100:5001/api
```

**ÖNEMLİ:** `.env` dosyaları git'e commit edilmez (güvenlik nedeniyle). Her geliştirici kendi `.env` dosyalarını oluşturmalıdır.

### 3. Bağımlılıkları Yükleme

#### Tüm Projeyi Kurmak İçin:
```bash
npm run install-all
```

#### Veya Ayrı Ayrı:
```bash
# Root dizinde
npm install

# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 4. Projeyi Çalıştırma

#### Hem Backend Hem Frontend (Önerilen):
```bash
npm start
```

#### Veya Ayrı Ayrı:
```bash
# Terminal 1 - Backend
cd backend
npm start

# Terminal 2 - Frontend
cd frontend
npm start
```

#### Development Modu (Nodemon ile):
```bash
npm run dev
```

## 🏗️ Proje Yapısı

```
tuketim-takip-sistemi/
├── backend/
│   ├── server.js              # Express server (Ana backend)
│   ├── config/
│   │   └── db.js              # MongoDB bağlantı yapılandırması
│   ├── controllers/           # Controller'lar
│   ├── models/                # Mongoose modelleri
│   ├── routes/                # API route'ları
│   ├── .env                   # Ortam değişkenleri (git'e commit edilmez)
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.js
│   │   ├── services/
│   │   │   └── api.js         # API bağlantı ayarları
│   │   └── ...
│   └── package.json
├── package.json               # Root package.json (concurrently için)
└── README.md
```

## 🔌 API Endpoints

### Dashboard
- `GET /api/stats/dashboard` - Tüm mahallelerin ortalama tüketim verileri

### Time Series
- `GET /api/stats/timeseries?mahalle=Çaydaçıra&kaynak=elektrik` - Son 7 günlük zaman serisi verileri
  - `kaynak`: `elektrik`, `su`, veya `dogalgaz`

### Readings
- `GET /api/readings/weekly-averages` - Haftalık ortalamalar
- `GET /api/readings/search?query=...` - Mahalle arama

## 🐛 Sorun Giderme

### Veriler MongoDB'den Gelmiyor / Ana Sayfada Veriler Yüklenmiyor

1. **Backend çalışıyor mu kontrol edin:**
   ```bash
   curl http://localhost:5001/api/stats/dashboard
   ```
   Eğer hata alıyorsanız, backend'i başlatın:
   ```bash
   cd backend
   npm start
   ```

2. **Backend .env dosyası var mı kontrol edin:**
   ```bash
   ls backend/.env
   ```
   Yoksa oluşturun:
   ```bash
   cd backend
   cp .env.example .env
   # Sonra .env dosyasını düzenleyip MONGO_URI'yi doldurun
   ```

3. **Frontend .env dosyası var mı kontrol edin:**
   ```bash
   ls frontend/.env
   ```
   Yoksa oluşturun:
   ```bash
   cd frontend
   cp .env.example .env
   # Eğer backend farklı bir adreste çalışıyorsa, REACT_APP_API_URL'i güncelleyin
   ```

4. **MongoDB bağlantısını test edin:**
   - MongoDB Atlas kullanıyorsanız: IP whitelist'inize bilgisayarınızın IP'sini eklediğinizden emin olun
   - `.env` dosyasındaki `MONGO_URI` değerinin doğru olduğundan emin olun
   - Backend console'da "✅ MongoDB Baglandi" mesajını görüyor musunuz?

5. **Port çakışması var mı kontrol edin:**
   ```bash
   lsof -i :5001  # Mac/Linux
   netstat -ano | findstr :5001  # Windows
   ```
   Eğer port kullanılıyorsa, başka bir process'i kapatın veya `.env` dosyasında `PORT` değerini değiştirin.

6. **CORS hatası alıyorsanız:**
   - Backend'de CORS ayarları tüm origin'lere izin verecek şekilde yapılandırılmıştır
   - Eğer hala sorun varsa, `backend/.env` dosyasında `CORS_ORIGIN` değerini kontrol edin

### Frontend API'ye Bağlanamıyor

1. **Backend'in çalıştığından emin olun** (yukarıya bakın)

2. **Frontend'in API URL'ini kontrol edin:**
   - `frontend/.env` dosyasında `REACT_APP_API_URL` değerini kontrol edin
   - Backend farklı bir bilgisayarda çalışıyorsa, IP adresini güncelleyin:
     ```env
     REACT_APP_API_URL=http://BACKEND_IP_ADRESI:5001/api
     ```

3. **Browser console'u kontrol edin:**
   - F12 tuşuna basıp Console sekmesine bakın
   - Hata mesajlarını kontrol edin (CORS, network, vb.)

4. **Network tab'ını kontrol edin:**
   - Browser DevTools'da Network sekmesine bakın
   - API isteklerinin gönderildiğini ve yanıt aldığını kontrol edin

### npm install Hataları

Eğer `npm install` sırasında hata alıyorsanız:
```bash
# Node.js versiyonunu kontrol edin (v14+ olmalı)
node --version

# npm cache'i temizleyin
npm cache clean --force

# Tekrar deneyin
npm install
```

## 📝 Önemli Notlar

- **Backend 5001 portunda, Frontend 3000 portunda çalışır**
- **Her geliştirici kendi `.env` dosyalarını oluşturmalıdır** (git'e commit edilmez)
  - `backend/.env` - MongoDB bağlantı bilgileri için
  - `frontend/.env` - API URL ayarları için
- MongoDB bağlantı bilgileri `backend/.env` dosyasında saklanır
- API URL ayarları `frontend/.env` dosyasında saklanır
- Proje artık tamamen Node.js tabanlıdır (Flask/Python kaldırıldı)
- **Farklı bilgisayarlarda çalıştırırken:** Frontend `.env` dosyasında `REACT_APP_API_URL` değerini backend'in IP adresine göre güncelleyin

## 🛠️ Geliştirme

### Yeni Endpoint Ekleme

1. `backend/routes/` klasöründe route dosyası oluşturun
2. `backend/controllers/` klasöründe controller oluşturun
3. `backend/server.js` dosyasına route'u ekleyin

### Frontend'de Yeni Sayfa Ekleme

1. `frontend/src/pages/` klasöründe yeni component oluşturun
2. `frontend/src/App.js` dosyasına route ekleyin

## 📄 Lisans

ISC

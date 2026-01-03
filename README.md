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
- Backend'i `http://localhost:5000` adresinde başlatır
- Frontend'i `http://localhost:3000` adresinde başlatır

## 📋 Detaylı Kurulum

### 1. Gereksinimler

- Node.js (v14 veya üzeri)
- npm veya yarn
- MongoDB Atlas hesabı (veya yerel MongoDB)

### 2. Ortam Değişkenlerini Ayarlama

`backend` klasöründe `.env` dosyası oluşturun:

```env
PORT=5000
MONGO_URI=mongodb+srv://kullanici:sifre@cluster.mongodb.net/tuketim_analizi_db?retryWrites=true&w=majority
```

**ÖNEMLİ:** `.env` dosyası git'e commit edilmez (güvenlik nedeniyle). Her geliştirici kendi `.env` dosyasını oluşturmalıdır.

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

### Veriler MongoDB'den Gelmiyor

1. **Backend çalışıyor mu kontrol edin:**
   ```bash
   curl http://localhost:5000/api/stats/dashboard
   ```
   Eğer hata alıyorsanız, backend'i başlatın.

2. **.env dosyası var mı kontrol edin:**
   ```bash
   ls backend/.env
   ```
   Yoksa oluşturun (yukarıdaki adımlara bakın).

3. **MongoDB bağlantısını test edin:**
   - MongoDB Atlas'ta IP whitelist'inize bilgisayarınızın IP'sini eklediğinizden emin olun
   - `.env` dosyasındaki `MONGO_URI` değerinin doğru olduğundan emin olun

4. **Port çakışması var mı kontrol edin:**
   ```bash
   lsof -i :5000  # Mac/Linux
   netstat -ano | findstr :5000  # Windows
   ```
   Eğer port kullanılıyorsa, başka bir process'i kapatın veya `.env` dosyasında `PORT` değerini değiştirin.

### Frontend API'ye Bağlanamıyor

1. **Backend'in çalıştığından emin olun** (yukarıya bakın)
2. **Frontend'in API URL'ini kontrol edin:** `frontend/src/services/api.js` dosyasında `API_URL` değerinin `http://127.0.0.1:5000/api` olduğundan emin olun.

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

- **Backend 5000 portunda, Frontend 3000 portunda çalışır**
- `.env` dosyası her geliştirici tarafından oluşturulmalıdır (git'e commit edilmez)
- MongoDB bağlantı bilgileri `.env` dosyasında saklanır
- Proje artık tamamen Node.js tabanlıdır (Flask/Python kaldırıldı)

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

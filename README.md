# Tüketim Takip Sistemi

## Kurulum Adımları

### 1. Backend Kurulumu (Flask)

#### Python Virtual Environment Oluşturma
```bash
cd backend
python3 -m venv venv
```

#### Virtual Environment Aktifleştirme
- **Mac/Linux:**
  ```bash
  source venv/bin/activate
  ```
- **Windows:**
  ```bash
  venv\Scripts\activate
  ```

#### Gerekli Paketleri Yükleme
```bash
pip install -r requirements.txt
```

**ÖNEMLİ:** `.env` dosyası git'e commit edilmez (güvenlik nedeniyle). Her geliştirici kendi `.env` dosyasını oluşturmalıdır.

#### Flask Backend'i Başlatma
```bash
cd backend
source venv/bin/activate  # Mac/Linux için
python app.py
```

Backend başarıyla başladığında şu mesajı göreceksiniz:
```
 * Running on http://127.0.0.1:5001
```

### 2. Frontend Kurulumu

```bash
cd frontend
npm install
npm start
```

Frontend `http://localhost:3000` adresinde çalışacaktır.

### 3. Node.js Backend (Opsiyonel)

Eğer Node.js backend'i de kullanacaksanız:

```bash
cd backend
npm install
node server.js
```

## Sorun Giderme

### Veriler MongoDB'den Gelmiyor

1. **Flask backend çalışıyor mu kontrol edin:**
   ```bash
   curl http://127.0.0.1:5001/api/stats/dashboard
   ```
   Eğer hata alıyorsanız, Flask backend'i başlatın.

2. **.env dosyası var mı kontrol edin:**
   ```bash
   ls backend/.env
   ```
   Yoksa oluşturun (yukarıdaki adımlara bakın).

3. **MongoDB bağlantısını test edin:**
   ```bash
   cd backend
   source venv/bin/activate
   python3 -c "from pymongo import MongoClient; import os; from dotenv import load_dotenv; load_dotenv(); client = MongoClient(os.getenv('MONGO_URI')); print('Bağlantı başarılı!' if client.server_info() else 'Bağlantı hatası!')"
   ```

4. **Port çakışması var mı kontrol edin:**
   ```bash
   lsof -i :5001  # Mac/Linux
   netstat -ano | findstr :5001  # Windows
   ```
   Eğer port kullanılıyorsa, başka bir process'i kapatın veya `.env` dosyasında `PORT` değerini değiştirin.

### Frontend API'ye Bağlanamıyor

1. **Flask backend'in çalıştığından emin olun** (yukarıya bakın)
2. **Frontend'in API URL'ini kontrol edin:** `frontend/src/services/api.js` dosyasında `API_URL` değerinin `http://127.0.0.1:5001/api` olduğundan emin olun.

## Proje Yapısı

```
tuketim-takip-sistemi/
├── backend/
│   ├── app.py              # Flask backend (Ana backend)
│   ├── server.js           # Node.js backend (Opsiyonel)
│   ├── .env                # Ortam değişkenleri (git'e commit edilmez)
│   ├── requirements.txt    # Python bağımlılıkları
│   └── venv/               # Python virtual environment
├── frontend/
│   ├── src/
│   │   ├── App.js
│   │   ├── services/
│   │   │   └── api.js      # API bağlantı ayarları
│   │   └── ...
│   └── package.json
└── README.md
```

## Önemli Notlar

- **Flask backend MUTLAKA çalışmalı** - Frontend verileri Flask backend'den alır
- `.env` dosyası her geliştirici tarafından oluşturulmalıdır (git'e commit edilmez)
- MongoDB bağlantı bilgileri `.env` dosyasında saklanır
- Backend 5001 portunda, Frontend 3000 portunda çalışır

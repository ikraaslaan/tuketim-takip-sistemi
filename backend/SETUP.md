# Backend Kurulum Rehberi

## Hızlı Kurulum

### 1. Python Virtual Environment Oluştur
```bash
python3 -m venv venv
```

### 2. Virtual Environment Aktifleştir
- **Mac/Linux:**
  ```bash
  source venv/bin/activate
  ```
- **Windows:**
  ```bash
  venv\Scripts\activate
  ```

### 3. Paketleri Yükle
```bash
pip install -r requirements.txt
```

### 4. .env Dosyası Oluştur
`backend` klasöründe `.env` dosyası oluştur ve şu içeriği ekle:

```env
PORT=5001
MONGO_URI=mongodb+srv://23frontend23_db_user:PaoDBStFSwY3nPR0@verikaynagi.bueal8j.mongodb.net/tuketim_analizi_db?retryWrites=true&w=majority
JWT_SECRET=uB7s!z@j4m9XkLpY$tGw&Qv5rFhA2eN8cCdI6oE3P0ZfT
SUPABASE_URL=https://lliwhbfkckpmmssgztrq.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sb_secret_S2HoGjRirYrWNGsxYBrc8g_5vLzsvpn
```

### 5. Flask Backend'i Başlat
```bash
python app.py
```

Başarılı olduğunda şunu göreceksin:
```
 * Running on http://127.0.0.1:5001
```

## Sorun Giderme

### "ModuleNotFoundError" hatası alıyorsan
```bash
source venv/bin/activate  # Virtual environment'ı aktifleştir
pip install -r requirements.txt  # Paketleri tekrar yükle
```

### "MONGO_URI" hatası alıyorsan
`.env` dosyasının `backend` klasöründe olduğundan ve içeriğinin doğru olduğundan emin ol.

### Port 5001 zaten kullanılıyor hatası
```bash
# Mac/Linux
lsof -i :5001
kill -9 <PID>

# Windows
netstat -ano | findstr :5001
taskkill /PID <PID> /F
```

Veya `.env` dosyasında `PORT=5002` gibi farklı bir port kullan.

### Veriler gelmiyor
1. Flask backend çalışıyor mu kontrol et:
   ```bash
   curl http://127.0.0.1:5001/api/stats/dashboard
   ```
2. MongoDB bağlantısını test et (yukarıdaki Python komutunu çalıştır)
3. Browser console'da hata var mı kontrol et


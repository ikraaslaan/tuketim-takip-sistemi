import json
from pymongo import MongoClient
import sys

# UTF-8 ayarı (Türkçe karakterler için)
sys.stdout.reconfigure(encoding='utf-8')

# 1. MongoDB Bağlantısı
uri = "Mongodb adresinizi buraya ekleyin"
client = MongoClient(uri)
db = client["tuketim_analizi_db"]
collection = db["mahalle_tanimlari"] # Verilerin duracağı yeni yer

# 2. Temizlik (Eski denemeleri siler, duplicate olmasın diye)
collection.delete_many({})
print("Eski kayıtlar temizlendi.")

# 3. JSON Dosyasını Oku
print("mahalleler.json okunuyor...")
try:
    with open('mahalleler.json', 'r', encoding='utf-8') as f:
        mahalle_listesi = json.load(f)
except FileNotFoundError:
    print("Hata: mahalleler.json bulunamadı!")
    exit()

# 4. MongoDB'ye Yükle
if isinstance(mahalle_listesi, list):
    # insert_many, iç içe objeleri ve listeleri olduğu gibi veritabanına gömer
    collection.insert_many(mahalle_listesi)
    print(f"Toplam {len(mahalle_listesi)} mahalle başarıyla veritabanına yüklendi!")
    print("İzzetpaşa'nın özel profilleri de güvenle saklandı.")
else:
    print("JSON formatı hatalı (Liste yapısında olmalı).")

client.close()
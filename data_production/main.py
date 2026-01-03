import pandas as pd
import time
import numpy as np
from copy import deepcopy
from pymongo import MongoClient
import sys

sys.stdout.reconfigure(encoding='utf-8')

# --- 1. MODÜLLERİ İÇERİ AKTAR ---
import uretim_modelleri as motor

from config import (
    PROFIL_KONUT_STANDART,PROFIL_KONUT_GELENEKSEL
)

# --- 2. AYARLAR ---
baslangic_tarihi = pd.to_datetime("2025-01-01 00:00:00")
bitis_tarihi     = pd.to_datetime("2025-12-31 23:30:00")
zaman_adimi      = pd.Timedelta(minutes=30)
output_filename  = "tuketim_verisi_tum_mahalleler_detayli.csv"

# --- MONGODB BAĞLANTISI ---
MONGODB_URI = "Mongodb adresinizi buraya ekleyin"
DB_NAME = "tuketim_analizi_db"

print("Veritabanına bağlanılıyor...")
client = MongoClient(MONGODB_URI)
db = client[DB_NAME]

# İki ayrı koleksiyon kullanıyoruz:
col_tanimlar = db["mahalle_tanimlari"]  # OKUMA YAPACAĞIMIZ YER (Eski json)
col_kayitlar = db["tuketim_kayitlari"]  # YAZMA YAPACAĞIMIZ YER (Sonuçlar)

# --- TEMİZLİK ---
# Simülasyonun kapsadığı tarih aralığını temizle
print(f"TEMİZLİK: {baslangic_tarihi} ile {bitis_tarihi} arasındaki eski veriler siliniyor...")
col_kayitlar.delete_many({
    "Tarih": {"$gte": baslangic_tarihi, "$lte": bitis_tarihi}
})

# --- 3. MAHALLELERİ VERİTABANINDAN ÇEK ---
print("Mahalle tanımları veritabanından okunuyor...")

# _id:0 diyerek MongoDB'nin kendi ID'sini çekmüyoruz, kafa karışmasın
mahalle_listesi_db = list(col_tanimlar.find({}, {"_id": 0}))

if not mahalle_listesi_db:
    print("HATA: Veritabanında kayıtlı mahalle bulunamadı! Lütfen önce verileri yükleyin.")
    exit()

# PROFİL BİRLEŞTİRME (Logic Aynen Kalıyor)
TANIMLI_PROFIL_SABLONLARI = {
    "konut_standart": PROFIL_KONUT_STANDART,
    "konut_geleneksel": PROFIL_KONUT_GELENEKSEL
}

MAHALLE_PROFILLERI = {}

for mahalle_data in mahalle_listesi_db:
    mahalle_adi = mahalle_data["mahalle_adi"]
    profil_tipi_adi = mahalle_data["profil_tipi"]

    if profil_tipi_adi in TANIMLI_PROFIL_SABLONLARI:
        profil_sablonu = deepcopy(TANIMLI_PROFIL_SABLONLARI[profil_tipi_adi])

        # Veritabanından gelen veriyi (Base değerler vb.) şablona ekle
        profil_sablonu.update(mahalle_data)

        # İZZETPAŞA KONTROLÜ:
        if "ozel_saatlik_profiller" in mahalle_data:
            profil_sablonu['saatlik_profiller'].update(mahalle_data["ozel_saatlik_profiller"])

        MAHALLE_PROFILLERI[mahalle_adi] = profil_sablonu
    else:
        print(f"UYARI → '{mahalle_adi}' için profil bulunamadı: {profil_tipi_adi}")

print(f"{len(MAHALLE_PROFILLERI)} mahalle veritabanından başarıyla yüklendi.")
print("-" * 30)

# --- 4. SİMÜLASYON ---
print("Simülatör çalışıyor...")
baslama_zaman = time.time()
uretilen_veriler = []
sanal_zaman = baslangic_tarihi

while sanal_zaman <= bitis_tarihi:

    for mahalle_adi, profil in MAHALLE_PROFILLERI.items():

        carpan_mevsim_e = motor.get_mevsimsel_carpan(sanal_zaman, "elektrik", profil)
        carpan_mevsim_s = motor.get_mevsimsel_carpan(sanal_zaman, "su", profil)
        carpan_mevsim_d = motor.get_mevsimsel_carpan(sanal_zaman, "dogalgaz", profil)

        carpan_gun = motor.get_gun_tipi_carpan(sanal_zaman, profil)

        carpan_saat_e = motor.get_saatlik_carpan(sanal_zaman, "elektrik", profil)
        carpan_saat_s = motor.get_saatlik_carpan(sanal_zaman, "su", profil)
        carpan_saat_d = motor.get_saatlik_carpan(sanal_zaman, "dogalgaz", profil)

        gurultu_e = np.random.normal(1.0, 0.08)
        gurultu_s = np.random.normal(1.0, 0.08)
        gurultu_d = np.random.normal(1.0, 0.05)

        uretilen_veriler.append({
            "Tarih": sanal_zaman,  # Datetime objesi olarak kalabilir, PyMongo bunu sever.
            "Mahalle": mahalle_adi,

            "Elektrik_Tuketim": round(
                profil["base_elektrik"] * carpan_mevsim_e * carpan_gun * carpan_saat_e * gurultu_e, 2
            ),
            "Su_Tuketim": round(
                profil["base_su"] * carpan_mevsim_s * carpan_gun * carpan_saat_s * gurultu_s, 2
            ),
            "Dogalgaz_Tuketim": round(
                profil["base_dogalgaz"] * carpan_mevsim_d * carpan_gun * carpan_saat_d * gurultu_d, 2
            ),
        })

    sanal_zaman += zaman_adimi

# --- SONUÇLARI KAYDETME ---
print("-" * 30)
print(f"Toplam Üretilen Kayıt: {len(uretilen_veriler)}")
print("MongoDB'ye yazılıyor...")

try:
    batch_size = 5000
    total = len(uretilen_veriler)

    for i in range(0, total, batch_size):
        col_kayitlar.insert_many(uretilen_veriler[i:i + batch_size])
        print(f"{min(i + batch_size, total)} / {total} yüklendi...")

    print("İşlem Başarılı!")

except Exception as e:
    print("Veritabanı Hatası:", e)

finally:
    client.close()
    print("Bağlantı kapatıldı.")

# CSV olarak da dursun istersen
df = pd.DataFrame(uretilen_veriler)
df.to_csv(output_filename, index=False, encoding="utf-8-sig")
print(f"Yedek CSV oluşturuldu: {output_filename}")

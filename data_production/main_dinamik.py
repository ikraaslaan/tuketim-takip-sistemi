import pandas as pd
import time
import numpy as np
from copy import deepcopy
from pymongo import MongoClient
import sys
import bakim_servisi # Yeni servisimiz
from datetime import datetime


# Arıza motorunu içeri alıyoruz
import ariza_simulasyonu as ariza_motoru

# UTF-8 ayarı
sys.stdout.reconfigure(encoding='utf-8')

# --- 1. MODÜLLERİ İÇERİ AKTAR ---
import uretim_modelleri as motor
from config import (
    PROFIL_KONUT_STANDART, PROFIL_SANAYI, 
    PROFIL_PARK, PROFIL_KAMPUS,
    PROFIL_KONUT_GELENEKSEL,PROFIL_AVM,
    PROFIL_KARMA
)

# --- 2. AYARLAR ---
baslangic_tarihi = pd.to_datetime("2026-01-01 00:00:00")
simulasyon_zaman_adimi = pd.Timedelta(hours=1) 
gercek_bekleme_suresi_sn = 15 

# --- MONGODB BAĞLANTISI ---
MONGODB_URI = "mongodb+srv://23frontend23_db_user:PaoDBStFSwY3nPR0@verikaynagi.bueal8j.mongodb.net"
DB_NAME = "tuketim_analizi_db"

print("Veritabanına bağlanılıyor...")
client = MongoClient(MONGODB_URI)
db = client[DB_NAME]

col_tanimlar = db["mahalle_tanimlari"]
col_kayitlar = db["tuketim_kayitlari"]

# --- BAŞLANGIÇ TEMİZLİĞİ ---
print("Veritabanındaki eski tüketim kayıtları temizleniyor (Temiz Başlangıç)...")
print("Veritabanında 2026 ve sonrası tüketim kayıtları siliniyor...")

col_kayitlar.delete_many({
    "tarih": {
        "$gte": datetime(2026, 1, 1)
    }
})

# --- 3. MAHALLELERİ YÜKLE ---
print("Mahalle profilleri hazırlanıyor...")
mahalle_listesi_db = list(col_tanimlar.find({}, {"_id": 0}))

if not mahalle_listesi_db:
    print("HATA: Mahalle tanımları bulunamadı! Lütfen önce 'mahalle_kayit.py' dosyasını çalıştır.")
    exit()

# PROFİL BİRLEŞTİRME
TANIMLI_PROFIL_SABLONLARI = {
    "konut_standart": PROFIL_KONUT_STANDART,
    "sanayi": PROFIL_SANAYI,
    "konut_geleneksel": PROFIL_KONUT_GELENEKSEL,
    "park": PROFIL_PARK,
    "kampus": PROFIL_KAMPUS,
    "avm": PROFIL_AVM,
    "konut_karma": PROFIL_KARMA,
}

MAHALLE_PROFILLERI = {}
for mahalle_data in mahalle_listesi_db:
    mahalle_adi = mahalle_data["mahalle_adi"]
    profil_tipi_adi = mahalle_data["profil_tipi"]
    
    if profil_tipi_adi in TANIMLI_PROFIL_SABLONLARI:
        profil_sablonu = deepcopy(TANIMLI_PROFIL_SABLONLARI[profil_tipi_adi])
        profil_sablonu.update(mahalle_data)
        if "ozel_saatlik_profiller" in mahalle_data:
            profil_sablonu['saatlik_profiller'].update(mahalle_data["ozel_saatlik_profiller"])
        MAHALLE_PROFILLERI[mahalle_adi] = profil_sablonu

print(f"{len(MAHALLE_PROFILLERI)} mahalle profili yüklendi. Simülasyon başlıyor...")
print("durdurmak için: CTRL + C tuşlarına basabilirsin.")
print("-" * 50)

# --- 4. CANLI SİMÜLASYON DÖNGÜSÜ ---
sanal_zaman = baslangic_tarihi

try:
    while True: # Sonsuz döngü
        
        anlik_veri_paketi = [] # Sadece bu saatin verileri

        # --- [ADIM 1] BAKIM PLANINI ÇEK ---
        aktif_bakimlar = bakim_servisi.aktif_bakimlari_getir(db, sanal_zaman)
        
        if aktif_bakimlar:
            print(f"⚠️ DİKKAT: {sanal_zaman} itibariyle aktif bakım/kesinti emri var: {aktif_bakimlar}")

        # Her mahalle için hesapla
        for mahalle_adi, profil in MAHALLE_PROFILLERI.items():
            
            # --- A. STANDART HESAPLAMALAR ---
            carpan_mevsim_e = motor.get_mevsimsel_carpan(sanal_zaman, "elektrik", profil)
            carpan_mevsim_s = motor.get_mevsimsel_carpan(sanal_zaman, "su", profil)
            carpan_mevsim_d = motor.get_mevsimsel_carpan(sanal_zaman, "dogalgaz", profil)

            carpan_gun      = motor.get_gun_tipi_carpan(sanal_zaman, profil)
            carpan_akademik = motor.get_akademik_carpan(sanal_zaman, profil)

            carpan_saat_e  = motor.get_saatlik_carpan(sanal_zaman, "elektrik", profil)
            carpan_saat_s  = motor.get_saatlik_carpan(sanal_zaman, "su", profil)
            carpan_saat_d  = motor.get_saatlik_carpan(sanal_zaman, "dogalgaz", profil)

            # Gürültü
            gurultu_e = np.random.normal(1.0, 0.12)
            gurultu_s = np.random.normal(1.0, 0.15)
            gurultu_d = np.random.normal(1.0, 0.08)

            # --- B. GEÇİCİ (TEMİZ) VERİYİ OLUŞTUR ---
            gecici_kayit = {
                "Tarih": sanal_zaman,
                "Mahalle": mahalle_adi,
                "Elektrik_Tuketim": round(profil["base_elektrik"] * carpan_mevsim_e * carpan_gun * carpan_akademik * carpan_saat_e * gurultu_e, 2),
                "Su_Tuketim":       round(profil["base_su"]       * carpan_mevsim_s * carpan_gun * carpan_akademik * carpan_saat_s * gurultu_s, 2),
                "Dogalgaz_Tuketim": round(profil["base_dogalgaz"] * carpan_mevsim_d * carpan_gun * carpan_akademik * carpan_saat_d * gurultu_d, 2),
            }
            
            # --- [ADIM 2] BAKIM VARSA SIFIRLA ---
            if mahalle_adi in aktif_bakimlar:
                etkilenen_kaynaklar = aktif_bakimlar[mahalle_adi]
                
                if "Elektrik" in etkilenen_kaynaklar:
                    gecici_kayit["Elektrik_Tuketim"] = 0.0
                
                if "Su" in etkilenen_kaynaklar:
                    gecici_kayit["Su_Tuketim"] = 0.0
                    
                if "Doğalgaz" in etkilenen_kaynaklar:
                    gecici_kayit["Dogalgaz_Tuketim"] = 0.0

            # --- [ADIM 3] ARIZA KONTROLÜ (RANDOM) ---
            # Not: Eğer yukarıda bakım nedeniyle veriyi 0 yaptıysak, 
            # arıza motoru genellikle çarpma işlemi yaptığı için (0 * 10 = 0) sonuç yine 0 kalır.
            # Bu da mantıken doğrudur: Suyu kesik boru patlamaz.
            
            final_kayit, olay_logu = ariza_motoru.ariza_uygula(mahalle_adi, gecici_kayit, aktif_bakimlar, db)
            if olay_logu:
                print(olay_logu) 

            # --- D. LİSTEYE FİNAL KAYDI EKLE ---
            anlik_veri_paketi.append(final_kayit)

        # Veritabanına ANLIK yaz
        if anlik_veri_paketi:
            col_kayitlar.insert_many(anlik_veri_paketi)
            print(f"[Canlı Akış] {sanal_zaman} tarihli veri üretildi. ({len(anlik_veri_paketi)} kayıt)")

        # Zamanı ilerlet
        sanal_zaman += simulasyon_zaman_adimi
        time.sleep(gercek_bekleme_suresi_sn)

except KeyboardInterrupt:
    print("\nSimülasyon kullanıcı tarafından durduruldu.")

finally:
    client.close()
    print("Bağlantı kapatıldı.")
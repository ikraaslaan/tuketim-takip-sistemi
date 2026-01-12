import random
from datetime import datetime

# --- HAFIZA (MEMORY) ---
SIMULASYON_HAFIZASI = {}

def ariza_uygula(mahalle_adi, veri_paketi, db_aktif_bakimlar, db):
    """
    db_aktif_bakimlar: incidents tablosundan gelen veriler { "Kültürpark": ["Su"], ... }
    """
    
    col_alarmlar = db["aktif_alarmlar"] 
    
    yeni_veri = veri_paketi.copy()
    olay_logu = None
    
    # ---------------------------------------------------------
    # 1. ADIM: INCIDENTS (KESİNTİ) TABLOSU KONTROLÜ
    # ---------------------------------------------------------
    # Eğer incidents tablosunda bu mahallede bir kayıt varsa (Planlı/Zorunlu Kesinti)
    if mahalle_adi in db_aktif_bakimlar:
        bakimdaki_kaynaklar = db_aktif_bakimlar[mahalle_adi] # Örn: ["Su", "Elektrik"]
        
        for kaynak in bakimdaki_kaynaklar:
            # EĞER INCIDENTS TABLOSUNDA KAYIT VARSA, ALARM TABLOSUNU TEMİZLE
            # Çünkü artık bu yönetilen bir olay, alarm vermeye gerek yok.
            silme_sonucu = col_alarmlar.delete_many({
                "Mahalle": mahalle_adi,
                "Kaynak": kaynak
            })
            
            if silme_sonucu.deleted_count > 0:
                print(f"✅ ÇAKIŞMA ÇÖZÜLDÜ: {mahalle_adi} - {kaynak} için 'incidents' kaydı bulundu. Aktif alarm silindi.")

            # AYRICA HAFIZAMIZDAN DA SİLELİM (Artık simülasyon arıza üretmesin)
            if mahalle_adi in SIMULASYON_HAFIZASI:
                hafizadaki_ariza = SIMULASYON_HAFIZASI[mahalle_adi]
                if hafizadaki_ariza == kaynak:
                    del SIMULASYON_HAFIZASI[mahalle_adi]

        # Bakım/Kesinti olduğu için veri paketini değiştirmeden (veya main.py'de sıfırlanmış haliyle) dönüyoruz.
        return yeni_veri, None

    # ---------------------------------------------------------
    # 2. ADIM: MEVCUT ARIZALARIN SENKRONİZASYONU (Alarm Silindi mi?)
    # ---------------------------------------------------------
    if mahalle_adi in SIMULASYON_HAFIZASI:
        bozuk_kaynak = SIMULASYON_HAFIZASI[mahalle_adi]
        
        # Hafızada arıza var, peki Alarm tablosunda hala duruyor mu?
        # (Belki admin incidents'a eklemedi ama alarmı sildi)
        aktif_alarm_var_mi = col_alarmlar.find_one({
            "Mahalle": mahalle_adi,
            "Kaynak": bozuk_kaynak
        })
        
        if not aktif_alarm_var_mi:
            print(f"♻️ SENKRONİZASYON: {mahalle_adi} alarmı silinmiş. Arıza sonlandırılıyor.")
            del SIMULASYON_HAFIZASI[mahalle_adi]
            return yeni_veri, None
            
        else:
            # Arıza devam ediyor
            if bozuk_kaynak == "Elektrik":
                yeni_veri["Elektrik_Tuketim"] *= 5.0
                olay_logu = f"🔥 {mahalle_adi}: Elektrik kaçağı DEVAM EDİYOR!"
            elif bozuk_kaynak == "Su":
                yeni_veri["Su_Tuketim"] *= 10.0
                olay_logu = f"💧 {mahalle_adi}: Su borusu patlak DEVAM EDİYOR!"
            elif bozuk_kaynak == "Doğalgaz":
                yeni_veri["Dogalgaz_Tuketim"] *= 8.0
                olay_logu = f"⚠️ {mahalle_adi}: Gaz kaçağı DEVAM EDİYOR!"
            
            return yeni_veri, olay_logu

    # ---------------------------------------------------------
    # 3. ADIM: YENİ RASTGELE ARIZA OLUŞTURMA
    # ---------------------------------------------------------
    if random.random() < 0.001: # %1 İhtimal
        
        zar = random.choice(["Elektrik", "Su", "Doğalgaz"])
        
        SIMULASYON_HAFIZASI[mahalle_adi] = zar
        
        yeni_alarm = {
            "Mahalle": mahalle_adi,
            "Kaynak": zar,
            "Mesaj": f"ACİL: {mahalle_adi} bölgesinde {zar} tüketiminde anomali tespit edildi!",
            "Tarih": veri_paketi["Tarih"],
            "Durum": "BEKLIYOR" 
        }
        col_alarmlar.insert_one(yeni_alarm)
        
        if zar == "Elektrik":
            yeni_veri["Elektrik_Tuketim"] *= 5.0
            olay_logu = f"💥 DİKKAT: {mahalle_adi} bölgesinde YENİ Elektrik kaçağı!"
        elif zar == "Su":
            yeni_veri["Su_Tuketim"] *= 10.0
            olay_logu = f"💥 DİKKAT: {mahalle_adi} bölgesinde YENİ Su patlağı!"
        elif zar == "Doğalgaz":
            yeni_veri["Dogalgaz_Tuketim"] *= 8.0
            olay_logu = f"💥 DİKKAT: {mahalle_adi} bölgesinde YENİ Doğalgaz kaçağı!"

    return yeni_veri, olay_logu
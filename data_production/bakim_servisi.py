import datetime

def aktif_bakimlari_getir(db, simulasyon_zamani):
    """
    Tarih kontrolünü DEVRE DIŞI bıraktık.
    Sadece 'Durum' sütunu 'Aktif' ise bakım var sayar.
    Böylece 2025 yılında girdiğin kayıt, 2026 simülasyonunda da çalışır.
    """
    col_incidents = db["incidents"]
    
    # --- SADECE DURUM KONTROLÜ ---
    # Tarih kriterlerini ($lte, $gte) sildik.
    # Artık incident tarihi 1990 da olsa, 2030 da olsa,
    # Durumu "Aktif" ise sisteme yansır.
    
    sorgu = {
        "Durum": {"$regex": "^aktif$", "$options": "i"} 
        # (Büyük/küçük harf duyarsız: Aktif, AKTIF, active hepsi kabul)
    }
    
    # Aktif kayıtları çek
    aktif_olaylar = list(col_incidents.find(sorgu))
    
    bakim_plani = {}
    
    for olay in aktif_olaylar:
        mahalle = olay.get("Mahalle")
        kaynak = olay.get("Kaynak_Tipi") # Örn: "Elektrik", "Su", "Dogalgaz"
        
        if mahalle and kaynak:
            if mahalle not in bakim_plani:
                bakim_plani[mahalle] = []
            
            # Aynı kaynağı mükerrer eklememek için kontrol
            if kaynak not in bakim_plani[mahalle]:
                bakim_plani[mahalle].append(kaynak)
                
    # Konsola bilgi verelim ki çalıştığını gör (İstersen sonra silebilirsin)
    if bakim_plani:
        print(f"🔧 BAKIM SERVİSİ: DB'den {len(aktif_olaylar)} adet 'AKTIF' kayıt çekildi. (Tarih bağımsız)")
                
    return bakim_plani
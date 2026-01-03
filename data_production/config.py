PROFIL_KONUT_STANDART = {
    'tip': 'konut', 
    'mevsimsel_carpani': {
        'dogalgaz_kis': 15.0,
        'elektrik_kis': 1.4,
        'yaz_klima': 1.8, 
        'yaz_su': 1.6
    },
    'gun_tipi_carpan': {'hici': 0.95, 'hsonu': 1.1},
    'saatlik_profiller': {
        'elektrik_hici_x':  [0,   5,   7,   8,   10, 16, 18, 20, 22, 24],
        'elektrik_hici_y':  [0.8, 0.3, 1.6, 1.6, 0.8, 0.8, 1.5, 2.0, 1.5, 0.8],
        'elektrik_hsonu_x': [0, 6, 8, 10, 17, 18, 20, 22, 24],
        'elektrik_hsonu_y': [0.8, 0.3, 1.1, 1.1, 1.2, 1.5, 2.0, 1.5, 0.8],
        
        'su_hici_x':        [0,   4,   8,   9.5, 11, 17, 19, 21, 24],
        'su_hici_y':        [0.4, 0.1, 2.2, 2.2, 0.7, 0.7, 1.5, 1.5, 0.4],
        'su_hsonu_x':       [0,   6, 10, 11.5, 13, 17, 19, 21, 24],
        'su_hsonu_y':       [0.4, 0.1, 2.0, 2.0, 0.8, 0.7, 1.5, 1.5, 0.4],
        
        'dogalgaz_kis_x':   [0,   4,   7,   10, 16, 18, 22, 24],
        'dogalgaz_kis_y':   [1.0, 0.95, 1.05, 0.98, 0.98, 1.02, 1.02, 1.0], 
        'dogalgaz_yaz_x':   [0,   5,   7,   9,   11, 17, 19, 21, 24],
        'dogalgaz_yaz_y':   [0.4, 0.1, 2.0, 1.5, 0.5, 0.5, 1.8, 1.0, 0.4],
    }
}

PROFIL_KONUT_GELENEKSEL = {
    'tip': 'konut', 
    'mevsimsel_carpani': {
        'dogalgaz_kis': 2.0,   # Doğalgaz soba/kombi olmadığı için kışın çok artmaz (Min kullanım).
        'elektrik_kis': 1.1,   
        'yaz_klima': 1.05,     # Klima neredeyse yok.
        'yaz_su': 2.5          # Bahçe/avlu sulama devam eder.
    },
    'gun_tipi_carpan': {'hici': 1.0, 'hsonu': 1.1},
    'saatlik_profiller': {
        # --- ELEKTRİK ---
        # Senaryo: 09:00 artış -> Sabit -> 15:00 hafif artış -> 19:00-23:00 ZİRVE
        'elektrik_hici_x':  [0,   7,   9,   14,  15,  18,  19,  23,  24],
        'elektrik_hici_y':  [0.4, 0.4, 1.0, 1.0, 1.3, 1.3, 2.2, 2.2, 0.5],
        
        # Hafta sonu da benzer olsun ama gündüz biraz daha dolu geçsin
        'elektrik_hsonu_x': [0,   8,   10,  15,  19,  23,  24],
        'elektrik_hsonu_y': [0.5, 0.5, 1.2, 1.5, 2.3, 2.3, 0.6],

        # --- SU ---
        # Senaryo: 09:00 artış -> 14:00 MAX -> Sonra kademeli düşüş
        'su_hici_x':        [0,   8,   9,   14,   18,  21,  24],
        'su_hici_y':        [0.4, 0.6, 1.2, 2.8,  1.5, 0.8, 0.1],
        
        # Hafta sonu temizlik daha yoğun olabilir
        'su_hsonu_x':       [0,   8,   10,  14,   18,  21,  24],
        'su_hsonu_y':       [0.4, 0.6, 1.5, 3.0,  1.8, 1.0, 0.1],

        # --- DOĞALGAZ (Minimum) ---
        # Sadece yemek pişirme saatlerinde (öğlen/akşam) minik tepeler
        'dogalgaz_kis_x':   [0,   7,   12,  14,  18,  20,  24],
        'dogalgaz_kis_y':   [0.2, 0.2, 0.6, 0.4, 0.8, 0.5, 0.2], 
        'dogalgaz_yaz_x':   [0, 24], 
        'dogalgaz_yaz_y':   [0.2, 0.2],
    }
}
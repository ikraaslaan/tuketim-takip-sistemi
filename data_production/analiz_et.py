import pandas as pd
import matplotlib.pyplot as plt
import sys

# UTF-8 ayarı
sys.stdout.reconfigure(encoding='utf-8')

print("Nihai İnteraktif Analiz Aracı Başlatılıyor...")
print("-" * 40)

# --- AYARLAR ---
CSV_DOSYASI = 'tuketim_verisi_tum_mahalleler_detayli.csv'

# --- Karşılaştırılacak 4 Senaryo Tarihleri ---
TARIH_KIS_HICI = '2025-01-06'  # Pazartesi (Kış)
TARIH_KIS_HSONU = '2025-01-11' # Cumartesi (Kış)
TARIH_YAZ_HICI = '2025-07-09'  # Pazartesi (Yaz)
TARIH_YAZ_HSONU = '2025-07-14' # Cumartesi (Yaz)

# --- 1. Veriyi Oku (Sadece bir kez) ---
print(f"Veri tabanı okunuyor: '{CSV_DOSYASI}' ...")
try:
    df = pd.read_csv(CSV_DOSYASI, parse_dates=['Tarih'])
    print("Veri başarıyla yüklendi.")
except FileNotFoundError:
    print(f"HATA: '{CSV_DOSYASI}' bulunamadı. Önce main.py'yi çalıştırın.")
    sys.exit()

# CSV içindeki benzersiz mahalle isimlerini bul
mevcut_mahalleler = df['Mahalle'].unique()
mevcut_mahalleler.sort() # Alfabetik sırala

def grafik_ciz(secilen_mahalle):
    print(f"\n--> '{secilen_mahalle}' için veriler hazırlanıyor...")
    
    # Veriyi Filtrele
    df_mahalle = df[df['Mahalle'] == secilen_mahalle].copy()

    # Tarihleri ayarla
    tarihler = [TARIH_KIS_HICI, TARIH_KIS_HSONU, TARIH_YAZ_HICI, TARIH_YAZ_HSONU]
    etiketler = ['Kış - Hafta İçi', 'Kış - Hafta Sonu', 'Yaz - Hafta İçi', 'Yaz - Hafta Sonu']
    renkler = ['blue', 'deepskyblue', 'red', 'orange']
    stiller = ['-', '--', '-', '--']
    
    dfs = []
    
    # 4 Tarih için verileri çek
    for t in tarihler:
        d_obj = pd.to_datetime(t).date()
        temp_df = df_mahalle[df_mahalle['Tarih'].dt.date == d_obj].copy()
        
        if temp_df.empty:
            print(f"UYARI: {t} tarihi için veri bulunamadı!")
            return # Fonksiyondan çık
            
        # Saat ekseni ekle
        temp_df['Saat'] = temp_df['Tarih'].dt.hour + temp_df['Tarih'].dt.minute / 60.0
        dfs.append(temp_df)

    # --- GRAFİK ÇİZİMİ ---
    fig, axes = plt.subplots(nrows=3, ncols=1, figsize=(16, 12), sharex=True)
    fig.suptitle(f"{secilen_mahalle} Mahallesi - Mevsimsel ve Günlük Analiz", fontsize=16)

    kaynaklar = [
        ('Elektrik_Tuketim', 'Elektrik (kW)', axes[0]),
        ('Su_Tuketim', 'Su (m³)', axes[1]),
        ('Dogalgaz_Tuketim', 'Doğalgaz (m³)', axes[2])
    ]

    for col_name, y_label, ax in kaynaklar:
        for i in range(4):
            ax.plot(dfs[i]['Saat'], dfs[i][col_name], 
                    color=renkler[i], linestyle=stiller[i], label=f"{etiketler[i]} ({tarihler[i]})")
        
        ax.set_ylabel(y_label)
        ax.grid(True, alpha=0.5)
        ax.legend(loc='upper right', fontsize='small')

    axes[2].set_xlabel('Günün Saati (00:00 - 24:00)')
    axes[2].set_xticks(range(0, 25, 2))

    plt.tight_layout(rect=[0, 0.03, 1, 0.96])
    print(f"--> Grafik açıldı. Devam etmek için grafik penceresini kapatın.")
    plt.show()

# --- ANA DÖNGÜ (MENU) ---
while True:
    print("\n" + "="*30)
    print("MEVCUT MAHALLELER:")
    for i, mahalle in enumerate(mevcut_mahalleler):
        print(f" {i+1}. {mahalle}")
    print("="*30)
    
    secim = input("İncelemek istediğiniz mahalle numarası (Çıkış için 'q'): ")
    
    if secim.lower() == 'q':
        print("Programdan çıkılıyor. İyi günler!")
        break
    
    try:
        index = int(secim) - 1
        if 0 <= index < len(mevcut_mahalleler):
            secilen = mevcut_mahalleler[index]
            grafik_ciz(secilen)
        else:
            print("HATA: Geçersiz numara girdiniz.")
    except ValueError:
        print("HATA: Lütfen bir sayı girin.")
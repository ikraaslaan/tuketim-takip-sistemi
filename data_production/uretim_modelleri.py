import numpy as np
import pandas as pd




# --- _gecis FONKSİYONU ---
def _gecis(tarih, deger_a, deger_b, baslangic_gunu=1):
    gun = tarih.day
    gun_sayisi = tarih.days_in_month
    bitis_gunu = gun_sayisi
    if gun < baslangic_gunu:
        return deger_a
    if gun > bitis_gunu:
        return deger_b
    toplam_gecis_gunu = (bitis_gunu - baslangic_gunu)
    if toplam_gecis_gunu <= 0:
        return deger_b
    oran = (gun - baslangic_gunu) / toplam_gecis_gunu
    return deger_a + (deger_b - deger_a) * oran


# --- MEVSİM FONKSİYONU (TAMAMEN GÜNCELLENMİŞ HALİ) ---
def get_mevsimsel_carpan(tarih, kaynak_tipi, profil):
    ay = tarih.month
    kurallar = profil.get("mevsimsel_carpani", {})

    if kaynak_tipi == "dogalgaz":
        kis_carpani = kurallar.get("dogalgaz_kis", 15.0)
        if ay in [12, 1, 2]:
            return kis_carpani
        if ay in [4, 5, 6, 7, 8, 9]:
            return 1.0
        if ay == 3:
            return _gecis(tarih, kis_carpani, 1.0)
        if ay == 10:
            return _gecis(tarih, 1.0, kis_carpani * 0.4, baslangic_gunu=20)
        if ay == 11:
            return _gecis(tarih, kis_carpani * 0.4, kis_carpani)

    elif kaynak_tipi == "elektrik":
        kis_carpani = kurallar.get("elektrik_kis", 1.4)
        yaz_klima_carpani = kurallar.get("yaz_klima", 1.8)
        if ay in [4, 5]:
            return 1.0
        if ay == 10:
            return _gecis(tarih, 1.0, 1.1, baslangic_gunu=20)
        if ay in [7, 8]:
            return yaz_klima_carpani
        if ay in [12, 1]:
            return kis_carpani
        if ay == 6:
            return _gecis(tarih, 1.0, yaz_klima_carpani)
        if ay == 9:
            return _gecis(tarih, yaz_klima_carpani, 1.0)
        if ay == 11:
            return _gecis(tarih, 1.1, kis_carpani)
        if ay == 2:
            return _gecis(tarih, kis_carpani, 1.1)
        if ay == 3:
            return _gecis(tarih, 1.1, 1.0)

    elif kaynak_tipi == "su":
        yaz_carpani = kurallar.get("yaz_su", 1.6)
        kis_carpani = kurallar.get("kis_su", 1.0)
        is_ozel_profil = (kis_carpani > 1.0) or (yaz_carpani > 3.0)

        if not is_ozel_profil:
            if ay in [10, 11, 12, 1, 2, 3]:
                return 1.0
            if ay in [6, 7, 8]:
                return yaz_carpani
            if ay == 4:
                return _gecis(tarih, 1.0, 1.2)
            if ay == 5:
                return _gecis(tarih, 1.2, 1.4)
            if ay == 9:
                return _gecis(tarih, yaz_carpani, 1.0)
        else:
            if ay in [11, 12, 1, 2]:
                return kis_carpani
            if ay in [6, 7, 8]:
                return yaz_carpani
            if ay == 3:
                return _gecis(tarih, kis_carpani, kis_carpani * 0.8)
            if ay == 4:
                return _gecis(tarih, kis_carpani * 0.8, yaz_carpani * 0.3)
            if ay == 5:
                return _gecis(tarih, yaz_carpani * 0.3, yaz_carpani)
            if ay == 9:
                return _gecis(tarih, yaz_carpani, kis_carpani * 1.5)
            if ay == 10:
                return _gecis(tarih, kis_carpani * 1.5, kis_carpani)

    return 1.0





# --- GÜN TİPİ FONKSİYONU (KAMPÜS İÇİN GÜNCELLENDİ) ---
def get_gun_tipi_carpan(tarih, profil):
    profil_tipi = profil.get("tip", "konut")
    kurallar = profil.get("gun_tipi_carpan", {})
    gun_no = tarih.dayofweek

    if profil_tipi == "sanayi":
        return 1.0
    elif profil_tipi == "kampus":
        if gun_no < 5:
            return kurallar.get("hici", 1.0)
        else:
            return kurallar.get("hsonu", 1.0)
    elif profil_tipi == "konut":
        if gun_no < 5:
            return kurallar.get("hici", 0.95)
        else:
            return kurallar.get("hsonu", 1.4)
    elif profil_tipi == "park":
        if gun_no < 5:
            return kurallar.get("hici", 0.95)
        else:
            return kurallar.get("hsonu", 1.1)
    else:
        if gun_no < 5:
            return kurallar.get("hici", 0.95)
        else:
            return kurallar.get("hsonu", 1.1)


# --- SAATLİK FONKSİYON (TAMAMEN GÜNCELLENMİŞ VE DÜZELTİLMİŞ) ---
def get_saatlik_carpan(tarih, kaynak_tipi, profil):
    anlik_saat = tarih.hour + tarih.minute / 60.0
    hafta_sonu = tarih.dayofweek >= 5
    ay = tarih.month
    profil_listeleri = profil.get("saatlik_profiller", {})
    profil_tipi = profil.get("tip", "konut")

    key_x = ""
    key_y = ""

    if kaynak_tipi == "elektrik":
        if profil_tipi == "kampus":
            is_tatil = _is_akademik_tatil(tarih)
            if is_tatil:
                key_x = "elektrik_tatil_hsonu_x" if hafta_sonu else "elektrik_tatil_hici_x"
            else:
                key_x = "elektrik_donem_hsonu_x" if hafta_sonu else "elektrik_donem_hici_x"
            key_y = key_x.replace("_x", "_y")
            if key_x not in profil_listeleri:
                key_x = ""

        if not key_x:
            key_x = "elektrik_hsonu_x" if hafta_sonu else "elektrik_hici_x"
            key_y = "elektrik_hsonu_y" if hafta_sonu else "elektrik_hici_y"

    elif kaynak_tipi == "su":
        if profil_tipi == "kampus":
            is_tatil = _is_akademik_tatil(tarih)
            if is_tatil:
                key_x = "su_tatil_hsonu_x" if hafta_sonu else "su_tatil_hici_x"
            else:
                key_x = "su_donem_hsonu_x" if hafta_sonu else "su_donem_hici_x"
            key_y = key_x.replace("_x", "_y")
            if key_x not in profil_listeleri:
                key_x = ""
        
        if not key_x: 
            is_summer = ay in [4, 5, 6, 7, 8, 9]
            yaz_key_x = "su_yaz_hsonu_x" if hafta_sonu else "su_yaz_hici_x"
            kis_key_x = "su_kis_hsonu_x" if hafta_sonu else "su_kis_hici_x"
            standart_key_x = "su_hsonu_x" if hafta_sonu else "su_hici_x"
            if yaz_key_x in profil_listeleri:
                key_x = yaz_key_x if is_summer else kis_key_x
                key_y = key_x.replace("_x", "_y")
            else:
                key_x = standart_key_x
                key_y = key_x.replace("_x", "_y")

    elif kaynak_tipi == "dogalgaz":
        is_summer = ay in [4, 5, 6, 7, 8, 9] or (ay == 10 and tarih.day <= 20) or (ay == 3 and tarih.day > 15)
        if is_summer:
            test_key_yaz_hici = "dogalgaz_yaz_hici_x"
            if test_key_yaz_hici in profil_listeleri:
                key_x = "dogalgaz_yaz_hsonu_x" if hafta_sonu else "dogalgaz_yaz_hici_x"
                key_y = key_x.replace("_x", "_y")
            else:
                key_x = "dogalgaz_yaz_x"
                key_y = "dogalgaz_yaz_y"
        else:
            key_x = "dogalgaz_kis_x"
            key_y = "dogalgaz_kis_y"

    X_SAATLER = profil_listeleri.get(key_x, [0, 24])
    Y_PROFIL = profil_listeleri.get(key_y, [1.0, 1.0])
    return np.interp(anlik_saat, X_SAATLER, Y_PROFIL)
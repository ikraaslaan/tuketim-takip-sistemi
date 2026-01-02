from flask import Flask, jsonify
from flask_cors import CORS
from pymongo import MongoClient
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app) # Frontend'in kapıyı çalmasına izin ver

# Bağlantı
client = MongoClient(os.getenv("MONGO_URI"))
# Veritabanını bağla (tuketim_analizi_db)
db = client["tuketim_analizi_db"]
tuketim_col = db["tuketim_kayitlari"]
mahalle_tanim_col = db["mahalle_tanimlari"]

@app.route('/api/stats/dashboard', methods=['GET'])
def get_dashboard_data():
    try:
        # Önce mahalle tanımlarından tüm mahalleleri al
        mahalleler = list(mahalle_tanim_col.find({}, {"_id": 0}))
        result = []
        
        # Son 30 günlük verileri al
        thirty_days_ago = datetime.now() - timedelta(days=30)
        
        # Her mahalle için ortalamaları hesapla
        for mahalle in mahalleler:
            mahalle_adi = mahalle.get("mahalle_adi", "")
            
            # Varsayılan değerler (mahalle tanımlarından)
            elektrik_ortalama = mahalle.get("base_elektrik", 0)
            su_ortalama = mahalle.get("base_su", 0)
            dogalgaz_ortalama = mahalle.get("base_dogalgaz", 0)
            
            # Eğer tüketim kayıtları varsa, ortalamaları hesapla
            try:
                # MongoDB'deki gerçek yapı: Elektrik_Tuketim, Su_Tuketim, Dogalgaz_Tuketim
                # Elektrik ortalaması
                elektrik_pipeline = [
                    {"$match": {
                        "Mahalle": mahalle_adi,
                        "Tarih": {"$gte": thirty_days_ago},
                        "Elektrik_Tuketim": {"$exists": True, "$ne": None}
                    }},
                    {"$group": {
                        "_id": None,
                        "ortalama": {"$avg": "$Elektrik_Tuketim"}
                    }}
                ]
                elektrik_result = list(tuketim_col.aggregate(elektrik_pipeline))
                if elektrik_result and elektrik_result[0].get("ortalama"):
                    elektrik_ortalama = round(elektrik_result[0]["ortalama"], 2)
                
                # Su ortalaması
                su_pipeline = [
                    {"$match": {
                        "Mahalle": mahalle_adi,
                        "Tarih": {"$gte": thirty_days_ago},
                        "Su_Tuketim": {"$exists": True, "$ne": None}
                    }},
                    {"$group": {
                        "_id": None,
                        "ortalama": {"$avg": "$Su_Tuketim"}
                    }}
                ]
                su_result = list(tuketim_col.aggregate(su_pipeline))
                if su_result and su_result[0].get("ortalama"):
                    su_ortalama = round(su_result[0]["ortalama"], 2)
                
                # Doğalgaz ortalaması
                dogalgaz_pipeline = [
                    {"$match": {
                        "Mahalle": mahalle_adi,
                        "Tarih": {"$gte": thirty_days_ago},
                        "Dogalgaz_Tuketim": {"$exists": True, "$ne": None}
                    }},
                    {"$group": {
                        "_id": None,
                        "ortalama": {"$avg": "$Dogalgaz_Tuketim"}
                    }}
                ]
                dogalgaz_result = list(tuketim_col.aggregate(dogalgaz_pipeline))
                if dogalgaz_result and dogalgaz_result[0].get("ortalama"):
                    dogalgaz_ortalama = round(dogalgaz_result[0]["ortalama"], 2)
            except Exception as e:
                # Hata durumunda base değerleri kullan
                import traceback
                print(f"Hata: {str(e)}")
                print(traceback.format_exc())
            
            result.append({
                "mahalle": mahalle_adi,
                "elektrik": {"ortalama": elektrik_ortalama},
                "su": {"ortalama": su_ortalama},
                "dogalgaz": {"ortalama": dogalgaz_ortalama}
            })
        
        return jsonify({"success": True, "data": result})
    except Exception as e:
        import traceback
        return jsonify({"success": False, "error": str(e), "traceback": traceback.format_exc()}), 500

if __name__ == '__main__':
    # .env'deki 5001 portunda çalış
    app.run(debug=True, port=int(os.getenv("PORT", 5001)))
import React, { useState, useEffect } from "react";
import { Calendar, Clock, Loader2, CheckCircle } from "lucide-react";
import api from "../../services/api";

const KesintiOlustur = () => {
  const [loading, setLoading] = useState(false);
  const [neighborhoods, setNeighborhoods] = useState([]);
  const [plannedOutages, setPlannedOutages] = useState([]);
  
  // Planlı Kesinti State
  const [newOutage, setNewOutage] = useState({
    Mahalle: "",
    Kaynak_Tipi: "Elektrik",
    Aciklama: "",
    Tarih: "",
    Baslangic_Saat: "",
    Bitis_Saat: ""
  });

  useEffect(() => {
    fetchNeighborhoods();
    fetchPlannedOutages();
    
    // Her 30 saniyede bir planlı kesintileri yenile (otomatik durum güncellemesi için)
    const interval = setInterval(() => {
      fetchPlannedOutages();
    }, 30000); // 30 saniye
    
    return () => clearInterval(interval);
  }, []);

  const fetchNeighborhoods = async () => {
    try {
      const response = await api.get("/stats/dashboard");
      if (response.data && response.data.success) {
        const names = response.data.data.map(item => item.mahalle);
        setNeighborhoods(names);
      }
    } catch (error) {
      console.error("Mahalle listesi yüklenemedi:", error);
    }
  };

  const fetchPlannedOutages = async () => {
    try {
      setLoading(true);
      const response = await api.get("/incidents/planned");
      let data = [];
      
      if (response.data && Array.isArray(response.data)) {
        data = response.data;
      } else if (response.data?.data) {
        data = response.data.data;
      }
      
      // Çözüldü kesintileri filtrele (ekstra güvenlik için)
      const filteredData = data.filter(outage => 
        outage.Durum !== 'Cozuldu' && 
        outage.Durum !== 'COZULDU'
      );
      
      setPlannedOutages(filteredData);
    } catch (error) {
      console.error("Planlı kesintiler yüklenemedi:", error);
      setPlannedOutages([]);
    } finally {
      setLoading(false);
    }
  };

  // Planlı kesintiyi çözüldü olarak işaretle
  const handleResolveOutage = async (id) => {
    if (!id) {
      alert("❌ Kesinti ID'si bulunamadı.");
      return;
    }
    
    if (!window.confirm("Bu planlı kesintiyi çözüldü olarak işaretlemek istiyor musunuz?")) return;
    
    try {
      console.log('🔧 Kesinti çözülüyor, ID:', id);
      const response = await api.put(`/incidents/${id}/coz`);
      
      if (response.data && response.data.success) {
        alert("✅ Planlı kesinti çözüldü olarak işaretlendi.");
        // Listeyi hemen yenile
        await fetchPlannedOutages();
      } else {
        alert("❌ İşlem başarısız: Beklenmeyen yanıt");
      }
    } catch (error) {
      console.error('❌ Kesinti çözme hatası:', error);
      const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || "Bilinmeyen hata";
      alert("❌ İşlem başarısız: " + errorMessage);
    }
  };

  // Planlı Kesinti Ekle
  const handleCreateOutage = async (e) => {
    e.preventDefault();
    if (!newOutage.Mahalle) {
      alert("⚠️ Lütfen bir mahalle seçin!");
      return;
    }
    if (!newOutage.Tarih) {
      alert("⚠️ Lütfen bir tarih seçin!");
      return;
    }
    if (!newOutage.Baslangic_Saat || !newOutage.Bitis_Saat) {
      alert("⚠️ Lütfen başlangıç ve bitiş saatlerini girin!");
      return;
    }

    try {
      // Tarih ve saatleri birleştir
      const baslangicTarihi = new Date(`${newOutage.Tarih}T${newOutage.Baslangic_Saat}`);
      const bitisTarihi = new Date(`${newOutage.Tarih}T${newOutage.Bitis_Saat}`);

      // Bitiş tarihi başlangıçtan sonra olmalı
      if (bitisTarihi <= baslangicTarihi) {
        alert("⚠️ Bitiş saati başlangıç saatinden sonra olmalıdır!");
        return;
      }

      const payload = {
        Mahalle: newOutage.Mahalle,
        Kaynak_Tipi: newOutage.Kaynak_Tipi,
        Aciklama: newOutage.Aciklama || "Planlı kesinti",
        Baslangic_Tarihi: baslangicTarihi.toISOString(),
        Bitis_Tarihi: bitisTarihi.toISOString()
      };

      await api.post("/incidents/planned", payload);
      alert("✅ Planlı kesinti başarıyla oluşturuldu!");
      setNewOutage({
        Mahalle: "",
        Kaynak_Tipi: "Elektrik",
        Aciklama: "",
        Tarih: "",
        Baslangic_Saat: "",
        Bitis_Saat: ""
      });
      fetchPlannedOutages();
    } catch (error) {
      alert("❌ Hata: " + (error.response?.data?.message || error.response?.data?.error || "İşlem başarısız."));
    }
  };

  const getResourceColor = (resource) => {
    if (resource === 'Elektrik') return 'bg-amber-100 text-amber-800 border-amber-300';
    if (resource === 'Su') return 'bg-blue-100 text-blue-800 border-blue-300';
    if (resource === 'Doğalgaz' || resource === 'Dogalgaz') return 'bg-orange-100 text-orange-800 border-orange-300';
    return 'bg-gray-100 text-gray-800 border-gray-300';
  };

  // Kaynak tipini görüntüleme için normalize et
  const formatResource = (resource) => {
    if (resource === 'Dogalgaz') return 'Doğalgaz';
    return resource;
  };

  const getStatusColor = (status, bitisTarihi) => {
    // Hem 'Cozuldu' hem 'COZULDU' formatlarını destekle
    if (status === 'Cozuldu' || status === 'COZULDU') return 'bg-green-100 text-green-800 border-green-300';
    // Hem 'Aktif' hem 'AKTIF' formatlarını destekle
    if (status === 'Aktif' || status === 'AKTIF') return 'bg-red-100 text-red-800 border-red-300';
    
    // Eğer bitiş tarihi geçmişse aktif olarak işaretle
    if (bitisTarihi && new Date(bitisTarihi) < new Date()) {
      return 'bg-gray-100 text-gray-800 border-gray-300';
    }
    
    return 'bg-yellow-100 text-yellow-800 border-yellow-300';
  };

  return (
    <div className="pt-24 px-8 min-h-screen bg-[#DDEEE3]">
      <div className="max-w-7xl mx-auto">
        {/* Başlık */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3 mb-2">
            <Calendar className="text-blue-600" size={32} />
            Planlı Kesinti Oluştur
          </h1>
          <p className="text-gray-600">Gelecekteki kesintileri planlayın ve yönetin</p>
        </div>

        {/* Planlı Kesinti Oluştur Formu */}
        <div className="bg-white rounded-2xl p-6 shadow-lg mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Yeni Planlı Kesinti</h2>
          <form onSubmit={handleCreateOutage} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Mahalle *</label>
                <select
                  value={newOutage.Mahalle}
                  onChange={(e) => setNewOutage({ ...newOutage, Mahalle: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                >
                  <option value="">Mahalle Seçin</option>
                  {neighborhoods.map((neighborhood) => (
                    <option key={neighborhood} value={neighborhood}>
                      {neighborhood}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Kaynak Tipi</label>
                <select
                  value={newOutage.Kaynak_Tipi}
                  onChange={(e) => setNewOutage({ ...newOutage, Kaynak_Tipi: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="Elektrik">Elektrik</option>
                  <option value="Su">Su</option>
                  <option value="Doğalgaz">Doğalgaz</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tarih *</label>
                <input
                  type="date"
                  value={newOutage.Tarih}
                  onChange={(e) => setNewOutage({ ...newOutage, Tarih: e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Başlangıç Saati *</label>
                <input
                  type="time"
                  value={newOutage.Baslangic_Saat}
                  onChange={(e) => setNewOutage({ ...newOutage, Baslangic_Saat: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Bitiş Saati *</label>
                <input
                  type="time"
                  value={newOutage.Bitis_Saat}
                  onChange={(e) => setNewOutage({ ...newOutage, Bitis_Saat: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Açıklama</label>
                <textarea
                  value={newOutage.Aciklama}
                  onChange={(e) => setNewOutage({ ...newOutage, Aciklama: e.target.value })}
                  placeholder="Kesinti açıklaması (opsiyonel)"
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold transition"
            >
              Planlı Kesinti Oluştur
            </button>
          </form>
        </div>

        {/* Planlı Kesintiler Listesi */}
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Planlı Kesintiler</h2>
          
          {loading ? (
            <div className="text-center py-10">
              <Loader2 className="animate-spin mx-auto mb-4 text-emerald-600" size={32} />
              <p className="text-gray-600">Yükleniyor...</p>
            </div>
          ) : plannedOutages.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              <Calendar className="mx-auto mb-2 text-gray-400" size={48} />
              <p>Planlı kesinti bulunmuyor.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {plannedOutages.map((outage) => (
                <div
                  key={outage._id || outage.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <h3 className="font-semibold text-gray-800">{outage.Mahalle}</h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getResourceColor(outage.Kaynak_Tipi)}`}>
                          {formatResource(outage.Kaynak_Tipi)}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(outage.Durum, outage.Bitis_Tarihi)}`}>
                          {outage.Durum || 'Pasif'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        {outage.Aciklama || 'Açıklama yok'}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <Clock size={14} />
                          <span>
                            Başlangıç: {new Date(outage.Baslangic_Tarihi).toLocaleString('tr-TR')}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock size={14} />
                          <span>
                            Bitiş: {new Date(outage.Bitis_Tarihi).toLocaleString('tr-TR')}
                          </span>
                        </div>
                      </div>
                    </div>
                    {/* Çözüldü butonu - Sadece çözülmemiş kesintiler için göster */}
                    {/* Planlı kesintiler varsayılan olarak 'Pasif' durumunda, bu yüzden sadece 'Cozuldu' kontrolü yapıyoruz */}
                    {outage.Durum !== 'Cozuldu' && 
                     outage.Durum !== 'COZULDU' && (
                      <button
                        onClick={() => handleResolveOutage(outage._id || outage.id)}
                        className="ml-4 flex-shrink-0 bg-green-100 hover:bg-green-200 text-green-700 px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2"
                        title="Kesintiyi Çözüldü Olarak İşaretle"
                      >
                        <CheckCircle size={16} />
                        Çözüldü
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default KesintiOlustur;

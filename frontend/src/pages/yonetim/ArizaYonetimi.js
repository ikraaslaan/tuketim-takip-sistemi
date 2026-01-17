import React, { useState, useEffect } from "react";
import { AlertTriangle, CheckCircle, Loader2 } from "lucide-react";
import api from "../../services/api";

const ArizaYonetimi = () => {
  const [loading, setLoading] = useState(true);
  const [incidents, setIncidents] = useState([]);
  const [neighborhoods, setNeighborhoods] = useState([]);
  
  // Anlık Arıza State
  const [newIncident, setNewIncident] = useState({
    Mahalle: "",
    Kaynak_Tipi: "Elektrik",
    Aciklama: "",
  });

  useEffect(() => {
    fetchData();
    fetchNeighborhoods();
    
    // Her 30 saniyede bir verileri otomatik yenile
    const interval = setInterval(() => {
      fetchData();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);
  
  // Sayfa görünür olduğunda (focus) verileri yenile
  useEffect(() => {
    const handleFocus = () => {
      fetchData();
    };
    
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
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

  const fetchData = async () => {
    try {
      setLoading(true);
      // Aktif arızaları çek
      const response = await api.get("/incidents/active");
      if (response.data && Array.isArray(response.data)) {
        setIncidents(response.data);
      } else if (response.data?.data) {
        setIncidents(response.data.data);
      }
    } catch (error) {
      console.error("Arızalar yüklenemedi:", error);
      setIncidents([]);
    } finally {
      setLoading(false);
    }
  };

  // Anlık Arıza Ekle
  const handleCreateInstantIncident = async (e) => {
    e.preventDefault();
    if (!newIncident.Mahalle) {
      alert("⚠️ Lütfen bir mahalle seçin!");
      return;
    }
    try {
      await api.post("/incidents/instant", newIncident);
      alert("✅ Anlık Arıza sisteme kaydedildi!");
      setNewIncident({ Mahalle: "", Kaynak_Tipi: "Elektrik", Aciklama: "" });
      fetchData();
    } catch (error) {
      alert("❌ Hata: " + (error.response?.data?.message || error.response?.data?.error || "İşlem başarısız."));
    }
  };

  // Arıza Çöz
  const handleResolveIncident = async (id) => {
    if (!window.confirm("Bu arızayı çözüldü olarak işaretlemek istiyor musunuz?")) return;
    try {
      await api.put(`/incidents/${id}/coz`);
      alert("✅ Arıza kapatıldı.");
      fetchData();
    } catch (error) {
      alert("❌ İşlem başarısız: " + (error.response?.data?.message || error.response?.data?.error || "Bilinmeyen hata"));
    }
  };

  const getResourceColor = (resource) => {
    if (resource === 'Elektrik') return 'bg-amber-100 text-amber-800 border-amber-300';
    if (resource === 'Su') return 'bg-blue-100 text-blue-800 border-blue-300';
    if (resource === 'Doğalgaz') return 'bg-orange-100 text-orange-800 border-orange-300';
    return 'bg-gray-100 text-gray-800 border-gray-300';
  };

  if (loading) {
    return (
      <div className="pt-24 px-8 min-h-screen bg-[#DDEEE3] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin mx-auto mb-4 text-emerald-600" size={32} />
          <p className="text-gray-600">Veriler yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-24 px-8 min-h-screen bg-[#DDEEE3]">
      <div className="max-w-7xl mx-auto">
        {/* Başlık */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3 mb-2">
            <AlertTriangle className="text-red-600" size={32} />
            Arıza Yönetimi
          </h1>
          <p className="text-gray-600">Anlık arızaları oluşturun ve yönetin</p>
        </div>

        {/* Anlık Arıza Oluştur Formu */}
        <div className="bg-white rounded-2xl p-6 shadow-lg mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Anlık Arıza Oluştur</h2>
          <form onSubmit={handleCreateInstantIncident} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Mahalle *</label>
                <select
                  value={newIncident.Mahalle}
                  onChange={(e) => setNewIncident({ ...newIncident, Mahalle: e.target.value })}
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
                  value={newIncident.Kaynak_Tipi}
                  onChange={(e) => setNewIncident({ ...newIncident, Kaynak_Tipi: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="Elektrik">Elektrik</option>
                  <option value="Su">Su</option>
                  <option value="Doğalgaz">Doğalgaz</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Açıklama</label>
                <input
                  type="text"
                  value={newIncident.Aciklama}
                  onChange={(e) => setNewIncident({ ...newIncident, Aciklama: e.target.value })}
                  placeholder="Arıza açıklaması (opsiyonel)"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <button
              type="submit"
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-semibold transition"
            >
              Arıza Oluştur
            </button>
          </form>
        </div>

        {/* Aktif Arızalar Listesi */}
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Aktif Arızalar</h2>
          
          {incidents.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              <CheckCircle className="mx-auto mb-2 text-green-500" size={48} />
              <p>Aktif arıza bulunmuyor.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {incidents.map((incident) => (
                <div
                  key={incident._id || incident.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-gray-800">{incident.Mahalle}</h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getResourceColor(incident.Kaynak_Tipi)}`}>
                          {incident.Kaynak_Tipi}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${
                          (incident.Durum === 'Aktif' || incident.Durum === 'AKTIF') 
                            ? 'bg-red-100 text-red-800 border-red-300'
                            : (incident.Durum === 'Cozuldu' || incident.Durum === 'COZULDU')
                            ? 'bg-green-100 text-green-800 border-green-300'
                            : 'bg-yellow-100 text-yellow-800 border-yellow-300'
                        }`}>
                          {incident.Durum || 'Aktif'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        {incident.Aciklama || 'Açıklama yok'}
                      </p>
                      <p className="text-xs text-gray-500">
                        Başlangıç: {new Date(incident.Baslangic_Tarihi).toLocaleString('tr-TR')}
                      </p>
                    </div>
                    <button
                      onClick={() => handleResolveIncident(incident._id || incident.id)}
                      className="ml-4 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
                    >
                      Çözüldü İşaretle
                    </button>
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

export default ArizaYonetimi;

import React, { useState, useEffect } from "react";
import api from "../../services/api";
import { CheckCircle, AlertTriangle, RotateCcw } from "lucide-react";

const ArizaYonetimi = () => {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchIncidents = async () => {
    try {
      const res = await api.get("/incidents");
      setIncidents(res.data.data);
    } catch (error) {
      console.error("Hata:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, []);

  // Toggle status handler - Optimistic UI update with immediate refresh
  const handleToggleStatus = async (id, currentStatus) => {
    // Handle multiple possible status formats
    const currentStatusUpper = String(currentStatus || '').toUpperCase();
    const isActive = currentStatusUpper === 'AKTIF' || currentStatusUpper === 'AKTİF';
    const newStatus = isActive ? 'PASIF' : 'AKTIF';
    const actionText = isActive ? 'çözüldü' : 'aktif';
    
    if (!window.confirm(`Bu arızayı ${actionText} olarak işaretlemek istiyor musunuz?`)) return;
    
    // Optimistic UI update - remove from list immediately if resolving
    if (isActive) {
      // If resolving, immediately filter out from the list
      setIncidents(prevIncidents => prevIncidents.filter(incident => incident._id !== id));
    } else {
      // If reactivating, update the status
      setIncidents(prevIncidents => 
        prevIncidents.map(incident => 
          incident._id === id 
            ? { ...incident, Durum: newStatus, Bitis_Tarihi: null }
            : incident
        )
      );
    }
    
    try {
      const response = await api.put(`/incidents/${id}/coz`);
      if (response.data && response.data.success) {
        // Success - refresh to get latest data from server
        console.log(`✅ Arıza başarıyla ${actionText} olarak işaretlendi.`);
        
        // Show success message
        if (isActive) {
          alert(`✅ Arıza çözüldü ve listeden kaldırıldı.`);
        } else {
          alert(`✅ Arıza tekrar aktif olarak işaretlendi.`);
        }
        
        // Always refresh to ensure UI is in sync with server
        await fetchIncidents();
      } else {
        // Revert optimistic update on error by refreshing
        fetchIncidents();
        alert("İşlem başarısız: " + (response.data?.message || "Bilinmeyen hata"));
      }
    } catch (error) {
      // Revert optimistic update on error by refreshing
      fetchIncidents();
      console.error("Arıza durum değiştirme hatası:", error);
      alert("İşlem başarısız: " + (error.response?.data?.message || error.message));
    }
  };

  if (loading) return <div className="text-center mt-20 text-emerald-800">Arızalar Yükleniyor...</div>;

  return (
    <div className="w-full max-w-7xl mx-auto pt-[100px] px-4 pb-10">
      <div className="bg-white/50 backdrop-blur-md rounded-3xl p-8 shadow-xl border border-white/60">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
          <AlertTriangle className="text-red-500" /> Aktif Arıza ve Kesintiler
        </h2>
        {(() => {
          // Filter to show only active incidents
          const activeIncidents = incidents.filter(incident => {
            const status = String(incident.Durum || '').toUpperCase();
            return status === 'AKTIF' || status === 'AKTİF';
          });
          
          return activeIncidents.length === 0 ? (
            <p className="text-center text-gray-500 py-10">Şu an aktif bir arıza bulunmuyor.</p>
          ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-gray-500 border-b border-gray-300">
                  <th className="p-4 font-medium">Durum</th>
                  <th className="p-4 font-medium">Tip</th>
                  <th className="p-4 font-medium">Mahalle</th>
                  <th className="p-4 font-medium">Kaynak</th>
                  <th className="p-4 font-medium">Açıklama</th>
                  <th className="p-4 font-medium">Tarih</th>
                  <th className="p-4 font-medium">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {activeIncidents.map((incident) => (
                  <tr key={incident._id} className="border-b border-gray-200/50 hover:bg-white/40 transition">
                    <td className="p-4"><span className={`px-3 py-1 rounded-full text-xs font-bold ${incident.Durum === 'AKTIF' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>{incident.Durum}</span></td>
                    <td className="p-4 text-sm font-semibold text-gray-700">{incident.Tip || "ARIZA"}</td>
                    <td className="p-4 font-medium text-gray-800">{incident.Mahalle}</td>
                    <td className="p-4 font-medium text-gray-800">{incident.Kaynak_Tipi}</td>
                    <td className="p-4 text-sm text-gray-600 max-w-xs truncate">{incident.Aciklama || "Belirtilmemiş"}</td>
                    <td className="p-4 text-sm text-gray-500">{new Date(incident.createdAt).toLocaleDateString("tr-TR")}</td>
                    <td className="p-4">
                      {(() => {
                        const status = String(incident.Durum || '').toUpperCase();
                        const isActive = status === 'AKTIF' || status === 'AKTİF';
                        if (isActive) {
                          // Show "Halledildi" button for active incidents
                          return (
                            <button 
                              onClick={() => handleToggleStatus(incident._id, incident.Durum)} 
                              className="flex items-center gap-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 px-3 py-1.5 rounded-lg text-sm font-medium transition"
                            >
                              <CheckCircle size={16} />
                              ✅ Halledildi
                            </button>
                          );
                        } else {
                          // Show "Geri Al" button for resolved incidents
                          return (
                            <button 
                              onClick={() => handleToggleStatus(incident._id, incident.Durum)} 
                              className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg text-sm font-medium transition"
                            >
                              <RotateCcw size={16} />
                              ↩️ Geri Al
                            </button>
                          );
                        }
                      })()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          );
        })()}
      </div>
    </div>
  );
};

export default ArizaYonetimi;
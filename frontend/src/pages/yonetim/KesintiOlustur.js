import React, { useState, useEffect } from "react";
import api from "../../services/api"; 
// EKSİK İKONLARI BURAYA EKLEDİM:
import { CalendarPlus, AlertTriangle, CheckCircle } from "lucide-react";

const KesintiOlustur = () => {
  // Mahalle listesini tutacak state
  const [neighborhoods, setNeighborhoods] = useState([]);
  
  // All incidents state
  const [incidents, setIncidents] = useState([]);
  
  // Dedicated state for planned outages (for better tracking)
  const [plannedOutages, setPlannedOutages] = useState([]);
  
  // Loading state
  const [loading, setLoading] = useState(true);

  // Form verileri
  const [newOutage, setNewOutage] = useState({
    Mahalle: "",
    Kaynak_Tipi: "Elektrik",
    Aciklama: "",
    Tarih: "",
    Baslangic_Saat: "",
    Bitis_Saat: ""
  });

  // Sayfa açılınca HEM Mahalleleri HEM DE Planlı Kesintileri çekelim
  useEffect(() => {
    fetchData();
    fetchPlannedOutages();
  }, []);

  // Fetch all data (neighborhoods and all incidents)
  const fetchData = async () => {
    try {
      // 1. Mahalleleri çek
      const resStats = await api.get("/stats/dashboard");
      setNeighborhoods(resStats.data.data || []);

      // 2. Mevcut Tüm Arızaları çek (for reference)
      const resIncidents = await api.get("/incidents");
      if (resIncidents.data.success && resIncidents.data.data) {
        setIncidents(resIncidents.data.data);
      }
    } catch (error) {
      console.error("❌ Veri çekme hatası:", error);
    }
  };

  // Dedicated function to fetch and filter planned outages
  const fetchPlannedOutages = async () => {
    try {
      setLoading(true);
      console.log("📋 Planlı kesintiler çekiliyor...");
      
      // Step 1: Fetch ONLY planned outages (Tip=PLANLI, Durum=Aktif) from backend
      // Backend now supports query parameters: ?type=PLANLI&status=Aktif
      // Note: Backend converts status=AKTIF to Durum='Aktif' (matches DB format)
      const resIncidents = await api.get("/incidents?type=PLANLI&status=AKTIF");
      
      // Step 2: DEBUG - Log the full response
      console.log("🔍 TÜM VERİLER (Full Response):", resIncidents.data);
      console.log("🔍 API Response Structure:", {
        success: resIncidents.data.success,
        hasData: !!resIncidents.data.data,
        dataLength: resIncidents.data.data?.length || 0,
        dataType: Array.isArray(resIncidents.data.data) ? 'Array' : typeof resIncidents.data.data
      });
      
      if (resIncidents.data.success && resIncidents.data.data) {
        const allIncidents = resIncidents.data.data;
        console.log("📊 Toplam incident sayısı:", allIncidents.length);
        
        // DEBUG: Log ALL incidents to see their structure
        if (allIncidents.length > 0) {
          console.log("🔍 TÜM İNCİDENTLER (All Incidents):", allIncidents);
          console.log("🔍 İlk 3 incident örneği (Türkçe alanlar):", allIncidents.slice(0, 3).map(inc => ({
            _id: inc._id,
            Mahalle: inc.Mahalle,                    // Turkish field
            Tip: inc.Tip,                            // Turkish field (not Tur)
            Durum: inc.Durum,                        // Turkish field
            Aciklama: inc.Aciklama,                  // Turkish field
            Baslangic_Tarihi: inc.Baslangic_Tarihi,  // Turkish field (not Baslangic_Zamani)
            Bitis_Tarihi: inc.Bitis_Tarihi,          // Turkish field
            allKeys: Object.keys(inc)
          })));
        }
        
        // Step 3: STRICT FILTER - Backend now standardizes to UPPERCASE
        // Filter for Tip='PLANLI' and Durum='AKTIF' (uppercase)
        const filtered = allIncidents.filter(inc => {
          // Use Turkish field names: Tip and Durum
          const tipValue = String(inc.Tip || '').toUpperCase();
          const durumValue = String(inc.Durum || '').toUpperCase();
          
          // STRICT CHECK: Tip must be 'PLANLI' and Durum must be 'AKTIF' (UPPERCASE)
          // Backend now standardizes all Durum values to uppercase
          const isPlanned = tipValue === 'PLANLI';
          const isActive = durumValue === 'AKTIF';
          
          const matches = isPlanned && isActive;
          
          // DEBUG: Log filtering decision
          if (matches) {
            console.log("✅ Planlı kesinti doğrulandı (UPPERCASE standard):", {
              id: inc._id,
              Mahalle: inc.Mahalle,
              Tip: inc.Tip,
              Durum: inc.Durum,
              Baslangic_Tarihi: inc.Baslangic_Tarihi
            });
          } else {
            console.log("⚠️ Filtrelendi (Tip veya Durum uyumsuz):", {
              id: inc._id,
              Mahalle: inc.Mahalle,
              Tip: inc.Tip,
              Durum: inc.Durum,
              isPlanned,
              isActive
            });
          }
          
          return matches;
        });
        
        console.log(`✅ ${filtered.length} aktif planlı kesinti bulundu (${allIncidents.length} toplam incident'ten)`);
        console.log("✅ Filtrelenmiş liste:", filtered);
        
        setPlannedOutages(filtered);
        setIncidents(allIncidents); // Also update incidents state
      } else {
        console.warn("⚠️ API response format beklenmedik:", resIncidents.data);
        setPlannedOutages([]);
      }
    } catch (error) {
      console.error("❌ Planlı kesintiler çekilirken hata:", error);
      console.error("❌ Error details:", error.response?.data || error.message);
      setPlannedOutages([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOutage = async (e) => {
    e.preventDefault();
    if (!newOutage.Mahalle) {
        alert("Lütfen bir mahalle seçiniz.");
        return;
    }
    
    try {
      // Combine date and time for Baslangic_Tarihi (matches DB schema)
      const dateTimeString = `${newOutage.Tarih}T${newOutage.Baslangic_Saat}:00`;
      const baslangicTarihi = new Date(dateTimeString);
      
      // Calculate duration from start and end time
      const startTime = new Date(`${newOutage.Tarih}T${newOutage.Baslangic_Saat}:00`);
      const endTime = new Date(`${newOutage.Tarih}T${newOutage.Bitis_Saat}:00`);
      const tahminiSure = Math.round((endTime - startTime) / (1000 * 60 * 60)); // Convert to hours
      
      // Calculate Bitis_Tarihi (end date)
      const bitisTarihi = endTime;
      
      // CRITICAL: Use EXACT Turkish field names matching database schema
      // FORCE UPPERCASE for Durum to standardize database
      const payload = {
        Mahalle: newOutage.Mahalle,              // Turkish: Mahalle
        Kaynak_Tipi: newOutage.Kaynak_Tipi,      // Turkish: Kaynak_Tipi
        Tip: 'PLANLI',                           // Turkish: Tip (uppercase)
        Durum: 'AKTIF',                          // CRITICAL: FORCE UPPERCASE to match backend standard
        Baslangic_Tarihi: baslangicTarihi.toISOString(), // Turkish: Baslangic_Tarihi
        Bitis_Tarihi: bitisTarihi.toISOString(), // Turkish: Bitis_Tarihi
        Aciklama: newOutage.Aciklama,            // Turkish: Aciklama
        Tahmini_Sure: tahminiSure > 0 ? tahminiSure : 1
      };
      
      console.log("📤 Planlı kesinti oluşturuluyor (Türkçe alan adları ile):", payload);
      
      const response = await api.post("/incidents/planned", payload);
      
      if (response.data.success) {
        alert("✅ Planlı kesinti başarıyla oluşturuldu ve bildirimler gönderildi!");
        
        // Formu temizle
        setNewOutage({ 
          Mahalle: "", 
          Kaynak_Tipi: "Elektrik", 
          Aciklama: "", 
          Tarih: "", 
          Baslangic_Saat: "", 
          Bitis_Saat: "" 
        });
        
        // CRITICAL: Refresh planned outages list immediately
        console.log("🔄 Liste güncelleniyor...");
        await fetchPlannedOutages();
        await fetchData(); // Also refresh all data
      }
    } catch (error) {
      console.error("❌ Kesinti oluşturma hatası:", error);
      const errorMsg = error.response?.data?.message || "Kesinti eklenemedi.";
      alert("❌ Hata: " + errorMsg);
    }
  };

  // Planlı Kesintiyi Tamamlandı Olarak İşaretle
  const handleCompleteOutage = async (id) => {
    if(!window.confirm("Bu planlı kesintiyi tamamlandı olarak işaretlemek istiyor musunuz?")) return;

    // Store the incident to restore on error
    const incidentToRemove = plannedOutages.find(inc => inc._id === id);
    
    try {
      // Optimistic UI: Remove from planned outages list immediately
      setPlannedOutages(prev => prev.filter(inc => inc._id !== id));
      setIncidents(prev => prev.filter(inc => inc._id !== id));

      // Call API to mark as resolved
      await api.put(`/incidents/${id}/coz`);
      
      // Refresh the list to ensure consistency
      await fetchPlannedOutages();
      
      // Show success message
      alert("✅ Planlı kesinti tamamlandı olarak işaretlendi ve listeden kaldırıldı.");
    } catch (error) {
      // On error, restore the item and show error
      if (incidentToRemove) {
        setPlannedOutages(prev => [...prev, incidentToRemove]);
        setIncidents(prev => [...prev, incidentToRemove]);
      }
      console.error("❌ Kesinti tamamlama hatası:", error);
      const errorMsg = error.response?.data?.message || "İşlem başarısız.";
      alert("❌ Hata: " + errorMsg);
    }
  };

  return (
    // ANA KAPSAYICI (Tüm her şey bunun içinde olmalı)
    <div className="w-full max-w-7xl mx-auto pt-[100px] px-4 pb-10 space-y-8">
      
      {/* --- BÖLÜM 1: FORM --- */}
      <div className="bg-white/60 backdrop-blur-md rounded-3xl p-8 shadow-xl border border-white/60">
        <h2 className="text-2xl font-bold text-emerald-900 mb-6 flex items-center gap-3">
          <CalendarPlus className="text-emerald-600" /> Planlı Kesinti Oluştur
        </h2>
        
        <form onSubmit={handleCreateOutage} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-700">Mahalle</label>
                <select 
                  className="p-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                  value={newOutage.Mahalle}
                  onChange={e => setNewOutage({...newOutage, Mahalle: e.target.value})}
                  required
                >
                    <option value="">Mahalle Seçiniz</option>
                    {neighborhoods.map((item) => (
                        <option key={item.mahalle} value={item.mahalle}>{item.mahalle}</option>
                    ))}
                </select>
            </div>
            
            <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-700">Kaynak Tipi</label>
                <select 
                  className="p-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                  value={newOutage.Kaynak_Tipi}
                  onChange={e => setNewOutage({...newOutage, Kaynak_Tipi: e.target.value})}
                >
                    <option value="Elektrik">Elektrik</option>
                    <option value="Su">Su</option>
                    <option value="Dogalgaz">Doğalgaz</option>
                </select>
            </div>

            <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-700">Tarih</label>
                <input 
                  type="date" 
                  className="p-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-500 outline-none"
                  min={new Date().toISOString().split('T')[0]}
                  value={newOutage.Tarih}
                  onChange={e => setNewOutage({...newOutage, Tarih: e.target.value})}
                  required
                />
            </div>

            <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-700">Başlangıç Saati</label>
                <input 
                  type="time" 
                  className="p-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-500 outline-none"
                  value={newOutage.Baslangic_Saat}
                  onChange={e => setNewOutage({...newOutage, Baslangic_Saat: e.target.value})}
                  required
                />
            </div>

            <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-700">Bitiş Saati</label>
                <input 
                  type="time" 
                  className="p-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-500 outline-none"
                  value={newOutage.Bitis_Saat}
                  onChange={e => setNewOutage({...newOutage, Bitis_Saat: e.target.value})}
                  required
                />
            </div>

            <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-700">Açıklama</label>
                <input 
                  type="text" 
                  placeholder="Örn: Bakım çalışması" 
                  className="p-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-500 outline-none"
                  value={newOutage.Aciklama}
                  onChange={e => setNewOutage({...newOutage, Aciklama: e.target.value})}
                  required
                />
            </div>
            
            <div className="flex items-end lg:col-span-3">
                <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-6 rounded-xl transition shadow-md">
                    Kesinti Ekle
                </button>
            </div>
        </form>
      </div>

      {/* --- BÖLÜM 2: TABLO (AKTİF PLANLI KESİNTİLER) --- */}
      <div className="bg-white/50 backdrop-blur-md rounded-3xl p-8 shadow-xl border border-white/60">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
            <CalendarPlus className="text-amber-500" /> Aktif Planlı Kesintiler ({plannedOutages.length})
        </h2>
        
        {loading ? (
          <div className="text-center text-gray-500 py-10">
            <p>Planlı kesintiler yükleniyor...</p>
          </div>
        ) : plannedOutages.length === 0 ? (
          <p className="text-center text-gray-500 py-10 bg-white/40 rounded-xl border border-dashed border-gray-300">
            Şu an aktif planlı kesinti yok.
          </p>
        ) : (
          (() => {

          return (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-gray-500 border-b border-gray-300">
                      <th className="p-4 font-medium">Durum</th>
                      <th className="p-4 font-medium">Mahalle</th>
                      <th className="p-4 font-medium">Kaynak</th>
                      <th className="p-4 font-medium">Açıklama</th>
                      <th className="p-4 font-medium">Başlangıç</th>
                      <th className="p-4 font-medium">Tahmini Süre</th>
                      <th className="p-4 font-medium">Bitiş</th>
                      <th className="p-4 font-medium">İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {plannedOutages.map((incident) => {
                    // Backend now standardizes Durum to UPPERCASE ('AKTIF' or 'PASIF')
                    const isActive = String(incident.Durum || '').toUpperCase() === 'AKTIF';
                    
                    // Use Turkish field names: Baslangic_Tarihi and Bitis_Tarihi (matches DB schema)
                    const startDate = incident.Baslangic_Tarihi 
                      ? new Date(incident.Baslangic_Tarihi) 
                      : (incident.createdAt ? new Date(incident.createdAt) : null);
                    const endDate = incident.Bitis_Tarihi ? new Date(incident.Bitis_Tarihi) : null;
                    
                    return (
                      <tr key={incident._id} className="border-b border-gray-200/50 hover:bg-white/40 transition">
                        <td className="p-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${isActive ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-600'}`}>
                                {isActive ? 'Aktif' : 'Tamamlandı'}
                            </span>
                        </td>
                        <td className="p-4 font-medium text-gray-800">{incident.Mahalle}</td>
                        <td className="p-4 font-medium text-gray-800">{incident.Kaynak_Tipi}</td>
                        <td className="p-4 text-sm text-gray-600">{incident.Aciklama || '-'}</td>
                        <td className="p-4 text-sm text-gray-500">
                          {startDate ? startDate.toLocaleString("tr-TR", {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          }) : '-'}
                        </td>
                        <td className="p-4 text-sm text-gray-500">
                          {incident.Tahmini_Sure ? `${incident.Tahmini_Sure} saat` : '-'}
                        </td>
                        <td className="p-4 text-sm text-gray-500">
                          {endDate ? endDate.toLocaleString("tr-TR", {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          }) : '-'}
                        </td>
                        <td className="p-4">
                            <button 
                              onClick={() => handleCompleteOutage(incident._id)} 
                              className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition shadow-sm hover:shadow-md active:scale-95"
                              title="Planlı kesintiyi tamamlandı olarak işaretle"
                            >
                                <CheckCircle size={16} /> Tamamlandı
                            </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
          })()
        )}
      </div>

    </div> 
  );
};

export default KesintiOlustur;
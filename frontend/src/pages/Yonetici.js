import React, { useState, useEffect, useMemo } from "react";
import api from "../services/api";
import { Zap, Droplets, Flame, Activity, LogOut, CalendarPlus, AlertTriangle, CheckCircle } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const Yonetici = ({ onLogout }) => {
  const [loading, setLoading] = useState(true);
  const [allData, setAllData] = useState([]); // Mahalle listesi için
  const [incidents, setIncidents] = useState([]); // Arıza listesi
  
  // Şehir Geneli Analiz State'leri
  const [activeTab, setActiveTab] = useState('electricity');
  const [cityAverages, setCityAverages] = useState({ electricity: 0, water: 0, gas: 0 });

  // 1. PLANLI KESİNTİ STATE (Tarih ve Saatler Ayrı)
  const [newOutage, setNewOutage] = useState({
    Mahalle: "",
    Kaynak_Tipi: "Elektrik",
    Aciklama: "",
    Tarih: "",          // Sadece YYYY-MM-DD
    Baslangic_Saat: "", // Sadece HH:MM
    Bitis_Saat: ""      // Sadece HH:MM
  });

  // 2. ANLIK ARIZA STATE
  const [newIncident, setNewIncident] = useState({
    Mahalle: "",
    Kaynak_Tipi: "Elektrik",
    Aciklama: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const statsRes = await api.get("/stats/dashboard");
      
      // Check if response is successful and has data
      if (statsRes.data && statsRes.data.success && statsRes.data.data) {
        const data = statsRes.data.data;
        setAllData(data); // Mahalle listesini doldur
        
        console.log("📊 Dashboard verisi:", data);
        console.log("📊 İlk örnek veri:", data[0]);
        
        if (data && data.length > 0) {
          const totalElektrik = data.reduce((sum, item) => {
            const elektrikValue = item.elektrik?.ortalama || item.elektrik || 0;
            return sum + Number(elektrikValue);
          }, 0);
          
          const totalSu = data.reduce((sum, item) => {
            const suValue = item.su?.ortalama || item.su || 0;
            return sum + Number(suValue);
          }, 0);
          
          const totalDogalgaz = data.reduce((sum, item) => {
            const dogalgazValue = item.dogalgaz?.ortalama || item.dogalgaz || 0;
            return sum + Number(dogalgazValue);
          }, 0);
          
          const averages = {
            electricity: data.length > 0 ? Math.round(totalElektrik / data.length) : 0,
            water: data.length > 0 ? Math.round(totalSu / data.length) : 0,
            gas: data.length > 0 ? Math.round(totalDogalgaz / data.length) : 0
          };
          
          console.log("📊 Hesaplanan Ortalamalar:", averages);
          console.log("📊 Toplamlar:", { totalElektrik, totalSu, totalDogalgaz, count: data.length });
          
          setCityAverages(averages);
        } else {
          console.warn("⚠️ Dashboard verisi boş veya geçersiz!");
          setCityAverages({ electricity: 0, water: 0, gas: 0 });
        }
      } else {
        console.error("❌ Dashboard API başarısız:", statsRes.data);
      }
      
      // Fetch incidents separately (optional, for future use)
      try {
        const incidentsRes = await api.get("/incidents/active");
        if (incidentsRes.data && Array.isArray(incidentsRes.data)) {
          setIncidents(incidentsRes.data);
        } else if (incidentsRes.data?.data) {
          setIncidents(incidentsRes.data.data);
        }
      } catch (incidentError) {
        console.error("Arıza verileri yüklenemedi (opsiyonel):", incidentError);
        setIncidents([]);
      }
    } catch (error) {
      console.error("Veri çekme hatası:", error);
      console.error("Hata detayı:", error.response?.data);
    } finally {
      setLoading(false);
    }
  };

  // GRAFİK VERİSİ
  const generateMockTrendData = useMemo(() => {
    const average = activeTab === 'electricity' ? cityAverages.electricity : activeTab === 'water' ? cityAverages.water : cityAverages.gas;
    if (average === 0) return [];
    return Array.from({ length: 30 }, (_, index) => {
      const value = average * (1 + (Math.sin(index * 0.2) * 0.15));
      return { day: `Gün ${index + 1}`, value: Math.max(0, Math.round(value)) };
    });
  }, [activeTab, cityAverages]);

  const chartColors = {
    electricity: { stroke: '#eab308', fill: '#fef08a' },
    water: { stroke: '#3b82f6', fill: '#93c5fd' },
    gas: { stroke: '#f97316', fill: '#fdba74' }
  };

  // --- FONKSİYONLAR ---

  // 1. Planlı Kesinti Ekle
  const handleCreateOutage = async (e) => {
    e.preventDefault();
    try {
        await api.post("/incidents/planned", newOutage); 
        alert("Planlı kesinti başarıyla oluşturuldu!");
        setNewOutage({ Mahalle: "", Kaynak_Tipi: "Elektrik", Aciklama: "", Tarih: "", Baslangic_Saat: "", Bitis_Saat: "" });
        fetchData(); 
    } catch (error) {
        alert("Hata: " + (error.response?.data?.message || "İşlem başarısız."));
    }
  };

  // 2. Anlık Arıza Ekle
  const handleCreateInstantIncident = async (e) => {
    e.preventDefault();
    try {
        await api.post("/incidents/instant", newIncident);
        alert("Anlık Arıza sisteme kaydedildi!");
        setNewIncident({ Mahalle: "", Kaynak_Tipi: "Elektrik", Aciklama: "" });
        fetchData(); 
    } catch (error) {
        alert("Hata: " + (error.response?.data?.message || "İşlem başarısız."));
    }
  };

  // 3. Arıza Çöz
  const handleResolveIncident = async (id) => {
    if (!window.confirm("Bu arızayı çözüldü olarak işaretlemek istiyor musunuz?")) return;
    try {
      await api.put(`/incidents/${id}/coz`);
      alert("Arıza kapatıldı.");
      fetchData();
    } catch (error) {
      alert("İşlem başarısız.");
    }
  };

  if (loading) return <div className="text-center mt-20 text-xl font-bold text-emerald-800">Veriler Yükleniyor...</div>;

  return (
    <div className="min-h-screen flex flex-col w-full max-w-7xl mx-auto px-4 pb-10 pt-[100px]">
      
      {/* ÜST BAŞLIK */}
      <div className="flex justify-between items-center mb-8 bg-white/40 p-6 rounded-2xl backdrop-blur-md border border-white/50 shadow-sm">
        <div>
            <h1 className="text-3xl font-bold text-emerald-900 flex items-center gap-3"><Activity className="text-emerald-600"/> Yönetici Paneli</h1>
            <p className="text-emerald-700 mt-1">Şehir geneli analiz ve arıza yönetimi.</p>
        </div>
        {/* Çıkış butonu buradan kaldırıldı */}
      </div>

      {/* GRAFİK BÖLÜMÜ */}
      <div className="bg-white/60 backdrop-blur-md rounded-3xl p-8 shadow-xl border border-white/60 mb-12">
        <h2 className="text-2xl font-bold text-emerald-900 mb-6 border-b pb-4 border-emerald-900/10">Şehir Geneli Analiz (Son 30 Gün)</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <button onClick={() => setActiveTab('electricity')} className={`p-5 rounded-2xl shadow-lg border-2 transition-all ${activeTab === 'electricity' ? 'border-yellow-500 bg-yellow-50/70' : 'border-white/50 bg-white/40'}`}>
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center bg-yellow-100 text-yellow-600"><Zap className="w-5 h-5" /></div>
                    <div><h3 className="text-sm font-medium text-gray-700">Ortalama Elektrik</h3><p className="text-2xl font-bold text-yellow-700">{cityAverages.electricity.toLocaleString()} kWh</p></div>
                </div>
            </button>
            <button onClick={() => setActiveTab('water')} className={`p-5 rounded-2xl shadow-lg border-2 transition-all ${activeTab === 'water' ? 'border-blue-500 bg-blue-50/70' : 'border-white/50 bg-white/40'}`}>
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center bg-blue-100 text-blue-600"><Droplets className="w-5 h-5" /></div>
                    <div><h3 className="text-sm font-medium text-gray-700">Ortalama Su</h3><p className="text-2xl font-bold text-blue-700">{cityAverages.water.toLocaleString()} m³</p></div>
                </div>
            </button>
            <button onClick={() => setActiveTab('gas')} className={`p-5 rounded-2xl shadow-lg border-2 transition-all ${activeTab === 'gas' ? 'border-orange-500 bg-orange-50/70' : 'border-white/50 bg-white/40'}`}>
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center bg-orange-100 text-orange-600"><Flame className="w-5 h-5" /></div>
                    <div><h3 className="text-sm font-medium text-gray-700">Ortalama Doğalgaz</h3><p className="text-2xl font-bold text-orange-700">{cityAverages.gas.toLocaleString()} m³</p></div>
                </div>
            </button>
        </div>
        <div className="w-full h-[400px] bg-white/80 rounded-xl p-4 border border-white/50">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={generateMockTrendData}>
              <defs>
                <linearGradient id={`color${activeTab}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={chartColors[activeTab].stroke} stopOpacity={0.8}/>
                  <stop offset="95%" stopColor={chartColors[activeTab].stroke} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="day" hide />
              <YAxis 
                domain={['dataMin - 100', 'dataMax + 100']} 
                hide={false}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#6b7280' }}
              />
              <Tooltip />
              <Area type="monotone" dataKey="value" stroke={chartColors[activeTab].stroke} fill={`url(#color${activeTab})`} strokeWidth={3} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
};

export default Yonetici;
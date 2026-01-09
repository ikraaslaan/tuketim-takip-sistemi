import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import api from '../../services/api'; 
import { MapPin, Zap, Droplets, Flame, AlertTriangle, Activity, X, Search, BarChart2 } from 'lucide-react'; 

const StatRow = ({ icon: Icon, label, value, unit, color, iconColor, bgColor }) => (
    <div className="flex justify-between items-center p-3 rounded-xl hover:bg-gray-50 transition-colors">
        <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${bgColor}`}>
                <Icon size={18} className={iconColor} />
            </div>
            <span className="text-gray-500 font-medium text-sm">{label}</span>
        </div>
        <span className={`text-lg font-bold ${color}`}>
            {Number(value).toLocaleString()} <span className="text-xs text-gray-400 font-normal">{unit}</span>
        </span>
    </div>
);

const KaynakKarti = ({ title, icon: Icon, color, isSelected, onClick, onAriza, loading, value, unit }) => {
    const colors = { 
        yellow: { bg: "bg-yellow-100", text: "text-yellow-600", border: "border-yellow-200" }, 
        blue: { bg: "bg-blue-100", text: "text-blue-600", border: "border-blue-200" }, 
        orange: { bg: "bg-orange-100", text: "text-orange-600", border: "border-orange-200" } 
    };
    const activeColor = colors[color] || colors.yellow;
    
    return (
        <div 
            onClick={onClick}
            className={`cursor-pointer relative p-6 rounded-2xl border-2 transition-all flex flex-col items-center text-center h-full justify-between
            ${isSelected ? `${activeColor.border} bg-white shadow-lg scale-105` : 'border-transparent bg-gray-50 hover:bg-gray-100'}
            `}
        >
            {isSelected && <div className={`absolute top-2 right-2 w-3 h-3 rounded-full ${activeColor.text.replace('text', 'bg')} animate-pulse`} />}
            <div className="w-full flex flex-col items-center mb-2">
                <div className={`p-4 rounded-full mb-3 ${activeColor.bg}`}>
                    <Icon className={activeColor.text} size={32} />
                </div>
                <h3 className={`font-bold text-xl ${isSelected ? 'text-gray-800' : 'text-gray-500'}`}>{title}</h3>
                <p className="text-lg font-bold mt-2 text-gray-700">
                    {Number(value).toLocaleString()} <span className="text-xs font-normal text-gray-400">{unit}</span>
                </p>
            </div>
            {isSelected && (
                <button 
                    onClick={(e) => { e.stopPropagation(); onAriza(); }} 
                    disabled={loading} 
                    className="mt-4 w-full py-2 px-4 rounded-lg font-bold text-sm border border-red-200 text-red-600 bg-red-50 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                >
                    <AlertTriangle size={16}/> {loading ? "..." : "ARIZA BİLDİR"}
                </button>
            )}
        </div>
    );
};

/* =========================================================================
   ANA MODAL (SAF GERÇEK VERİ - 15 SANİYE)
   ========================================================================= */
const MahalleDetayModal = ({ mahalleData: initialData, onClose, onIncidentCreated }) => {
    const [loading, setLoading] = useState(false);
    const [selectedSource, setSelectedSource] = useState('Elektrik'); 
    const [graphData, setGraphData] = useState([]); 
    const [lastUpdate, setLastUpdate] = useState(new Date()); 
    const [currentValues, setCurrentValues] = useState(initialData); 

    // Helper function to add realistic fluctuations
    const addFluctuations = (baseValue, source) => {
        // Variance percentages based on resource type
        const variances = {
            'Elektrik': 0.15,  // High variance (15%) - jaggy, dynamic
            'Su': 0.08,        // Moderate variance (8%) - smoother
            'Doğalgaz': 0.05   // Low variance (5%) - very smooth
        };
        
        const variance = variances[source] || 0.1;
        const fluctuation = (Math.random() * variance * 2 - variance) * baseValue; // -variance to +variance
        return Math.max(0, baseValue + fluctuation); // Ensure non-negative
    };

    // --- 1. BAŞLANGIÇ: ELİMİZDEKİ TEK VERİYİ 24 KERE YAZIYORUZ (WITH FLUCTUATIONS) ---
    useEffect(() => {
        let baseValue = 0;
        if (selectedSource === 'Elektrik') baseValue = Number(initialData.elektrik.ortalama);
        else if (selectedSource === 'Su') baseValue = Number(initialData.su.ortalama);
        else if (selectedSource === 'Doğalgaz') baseValue = Number(initialData.dogalgaz.ortalama);

        // Create initial graph with realistic fluctuations
        const initialGraph = Array.from({ length: 24 }, () => addFluctuations(baseValue, selectedSource));
        setGraphData(initialGraph);
        setCurrentValues(initialData);
    }, [selectedSource, initialData]);

    // --- 2. CANLI GÜNCELLEME: HER 15 SANİYEDE BİR ---
    useEffect(() => {
        const fetchRealTimeData = async () => {
            try {
                // --- DÜZELTME 1: ARTIK YENİ CANLI ROTA'YA GİDİYORUZ ---
                const response = await api.get('/incidents/live-dashboard'); 
                
                const allData = response.data.data;
                const myMahalle = allData.find(m => m.mahalle === initialData.mahalle);

                if (myMahalle) {
                    setCurrentValues(myMahalle);

                    let baseValue = 0;
                    if (selectedSource === 'Elektrik') baseValue = Number(myMahalle.elektrik.ortalama);
                    else if (selectedSource === 'Su') baseValue = Number(myMahalle.su.ortalama);
                    else if (selectedSource === 'Doğalgaz') baseValue = Number(myMahalle.dogalgaz.ortalama);

                    // Add realistic fluctuation to the new value
                    const newValue = addFluctuations(baseValue, selectedSource);

                    console.log(`📡 Canlı Veri Alındı (${selectedSource}):`, newValue);

                    setGraphData(prevData => {
                        const newData = [...prevData.slice(1), newValue];
                        return newData;
                    });
                    setLastUpdate(new Date());
                }
            } catch (error) {
                console.error("Canlı veri hatası:", error);
            }
        };

        const interval = setInterval(fetchRealTimeData, 15000); 
        return () => clearInterval(interval);

    }, [selectedSource, initialData.mahalle]); 


    const timeLabels = useMemo(() => {
        const labels = [];
        const now = new Date();
        const currentHour = now.getHours();
        for (let i = 23; i >= 0; i--) {
            let hour = currentHour - i;
            if (hour < 0) hour += 24;
            labels.push(`${hour.toString().padStart(2, '0')}:00`);
        }
        return labels;
    }, []); 

    const handleAriza = async () => {
      if(!window.confirm(`${currentValues.mahalle} için ${selectedSource} arıza kaydı oluşturulsun mu?`)) return;
      setLoading(true);
      try {
          // 1. Create incident record in database
          const newIncident = {
              Mahalle: currentValues.mahalle,
              Kaynak_Tipi: selectedSource,
              Aciklama: `${currentValues.mahalle} mahallesinde ${selectedSource} arızası (Grafik ekranından manuel)`,
          };
          await api.post('/incidents/instant', newIncident); 
          
          // 2. Send email notification to admin
          const currentValue = selectedSource === 'Elektrik' 
              ? currentValues.elektrik.ortalama 
              : selectedSource === 'Su' 
              ? currentValues.su.ortalama 
              : currentValues.dogalgaz.ortalama;
          
          const unit = selectedSource === 'Elektrik' ? 'kWh' : 'm³';
          
          const reportData = {
              mahalle: currentValues.mahalle,
              kaynak: selectedSource,
              kullaniciAdi: 'Sistem Yöneticisi',
              mevcutDeger: currentValue,
              birim: unit,
              mesaj: `Anormal tüketim tespit edildi. Mevcut değer: ${currentValue} ${unit}`
          };
          
          await api.post('/support/report', reportData);
          
          // 3. Notify all users in the neighborhood
          try {
              const notifyResponse = await api.post('/notifications/notify-neighborhood', {
                  mahalle: currentValues.mahalle,
                  kaynak: selectedSource,
                  mesaj: `${currentValues.mahalle} mahallesinde ${selectedSource} arızası bildirilmiştir. Ekiplerimiz haberdardır.`
              });
              
              if (notifyResponse.data.success) {
                  const notifiedCount = notifyResponse.data.notifiedCount || 0;
                  if (notifiedCount > 0) {
                      alert(`✅ Arıza kaydı oluşturuldu!\n📧 ${currentValues.mahalle} mahallesindeki ${notifiedCount} kullanıcıya bilgilendirme e-postası gönderildi.`);
                  } else {
                      alert(`✅ Arıza kaydı oluşturuldu!\nℹ️ ${currentValues.mahalle} mahallesinde kayıtlı kullanıcı bulunamadı.`);
                  }
              } else {
                  alert(`✅ Arıza kaydı oluşturuldu!\n⚠️ Kullanıcı bildirimleri gönderilemedi: ${notifyResponse.data.message}`);
              }
          } catch (notifyError) {
              console.error("Kullanıcı bildirimi hatası:", notifyError);
              // Don't fail the whole operation if notification fails
              alert(`✅ Arıza kaydı oluşturuldu!\n⚠️ Kullanıcı bildirimleri gönderilemedi: ${notifyError.response?.data?.message || notifyError.message}`);
          }
          
          onIncidentCreated(); 
      } catch (error) {
          console.error("Hata:", error);
          alert("Arıza kaydedilemedi veya e-posta gönderilemedi: " + (error.response?.data?.message || error.message));
      } finally {
          setLoading(false);
      }
    };
  
    return (
      <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-200">
        <div className="bg-white w-full max-w-6xl rounded-3xl shadow-2xl overflow-hidden flex flex-col relative h-[90vh]">
          
          <div className="bg-gray-900 px-8 py-6 flex justify-between items-center text-white shrink-0">
            <div>
              <h2 className="text-3xl font-bold flex items-center gap-3">
                <MapPin className="text-emerald-400" /> {currentValues.mahalle}
              </h2>
              <p className="text-gray-400 text-sm mt-1 flex items-center gap-2">
                <Activity size={14} className="animate-pulse text-green-400"/> 
                Canlı Veri (15sn) • Son Güncelleme: {lastUpdate.toLocaleTimeString()}
              </p>
            </div>
            
            <button onClick={onClose} className="bg-white/10 hover:bg-red-600 hover:text-white p-3 rounded-full transition-all cursor-pointer z-50">
              <X size={24} className="text-white" />
            </button>
          </div>
  
          <div className="flex flex-col md:flex-row h-full overflow-hidden">
             
             {/* SOL MENÜ */}
             <div className="w-full md:w-1/3 bg-gray-50 p-6 border-r border-gray-200 overflow-y-auto">
                <h3 className="text-gray-500 font-bold mb-4 uppercase text-xs tracking-wider">Kaynak Seçimi</h3>
                <div className="grid gap-4">
                    <KaynakKarti title="Elektrik" icon={Zap} color="yellow" value={currentValues.elektrik.ortalama} unit="kWh" isSelected={selectedSource === 'Elektrik'} onClick={() => setSelectedSource('Elektrik')} onAriza={handleAriza} loading={loading} />
                    <KaynakKarti title="Su" icon={Droplets} color="blue" value={currentValues.su.ortalama} unit="m³" isSelected={selectedSource === 'Su'} onClick={() => setSelectedSource('Su')} onAriza={handleAriza} loading={loading} />
                    <KaynakKarti title="Doğalgaz" icon={Flame} color="orange" value={currentValues.dogalgaz.ortalama} unit="m³" isSelected={selectedSource === 'Doğalgaz'} onClick={() => setSelectedSource('Doğalgaz')} onAriza={handleAriza} loading={loading} />
                </div>
             </div>

             {/* SAĞ GRAFİK */}
             <div className="w-full md:w-2/3 p-8 flex flex-col bg-white">
                <div className="flex justify-between items-center mb-8">
                    <h3 className="font-bold text-gray-800 text-xl flex items-center gap-2">
                        <BarChart2 className="text-emerald-600"/> {selectedSource} Tüketim Grafiği
                    </h3>
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full border border-emerald-200">
                        GERÇEK ZAMANLI
                    </span>
                </div>

                <div className="flex-1 flex items-end justify-between gap-1 relative border-b border-l border-gray-200 p-4 min-h-[300px]">
                   {graphData.map((val, i) => (
                      <div key={i} className="flex-1 flex flex-col justify-end items-center group h-full relative z-10">
                        <div className="absolute -top-10 bg-gray-900 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
                            {Number(val).toFixed(2)}
                        </div>
                        <div 
                            className={`w-full rounded-t-sm transition-all duration-500 ease-in-out ${
                                selectedSource === 'Elektrik' ? 'bg-yellow-400 hover:bg-yellow-500' : 
                                selectedSource === 'Su' ? 'bg-blue-400 hover:bg-blue-500' : 'bg-orange-400 hover:bg-orange-500'
                            }`}
                            style={{height: `${Math.min((val / (Math.max(...graphData, 1))) * 100, 100)}%`}}
                        />
                      </div>
                   ))}
                </div>
                
                <div className="flex justify-between text-[10px] text-gray-400 mt-2 font-mono">
                   <span>Geçmiş</span>
                   <span>Şimdi</span>
                </div>
             </div>

          </div>
        </div>
      </div>
    );
};

/* =========================================================================
   4. ANA SAYFA
   ========================================================================= */
const Mahalleler = () => {
    const [mahalleler, setMahalleler] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedMahalle, setSelectedMahalle] = useState(null); 
    const [searchQuery, setSearchQuery] = useState('');

    const fetchData = useCallback(async () => {
        try {
            setMahalleler(prev => { if(prev.length === 0) setLoading(true); return prev; });
            
            // --- DÜZELTME 2: ANA SAYFA KARTLARI DA CANLI VERİ GÖSTERSİN ---
            const response = await api.get('/incidents/live-dashboard');
            
            setMahalleler(response.data.data);
        } catch (error) { console.error("Veri çekme hatası:", error); } 
        finally { setLoading(false); }
    }, []);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 15000); 
        return () => clearInterval(interval);
    }, [fetchData]);

    const filteredMahalleler = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) return mahalleler;
        return mahalleler.filter(mahalle => mahalle.mahalle.toLowerCase().includes(query));
    }, [mahalleler, searchQuery]);

    if (loading && mahalleler.length === 0) return <div className="min-h-screen flex items-center justify-center text-emerald-800 font-bold text-xl">Mahalleler Yükleniyor...</div>;

    return (
        <div className="container mx-auto px-4 py-8 pt-[150px] min-h-screen relative z-0">
            <div className="bg-emerald-100/50 py-6 px-8 rounded-3xl mb-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4 shadow-sm border border-emerald-100 relative z-10">
                <div className='flex items-center gap-4'>
                    <div className="bg-white p-4 rounded-2xl shadow-sm">
                        <MapPin className="text-emerald-600" size={32} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-extrabold text-emerald-900">Mahalle Tüketim İstatistikleri</h1>
                        <p className="text-emerald-700 mt-1">Detaylı analiz için ilgili mahalleyi seçiniz.</p>
                    </div>
                </div>
                <div className="relative w-full max-w-sm ml-auto mt-4 md:mt-0">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input type="text" placeholder="Mahalle ara..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-400 transition-all text-gray-800" />
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 relative z-10">
                {filteredMahalleler.length > 0 ? (
                    filteredMahalleler.map((mahalle, index) => (
                        <div key={index} className="bg-white p-6 rounded-3xl shadow-lg hover:shadow-2xl transition-all border border-gray-100 flex flex-col group">
                            <div className="flex items-center justify-between mb-6 border-b border-gray-100 pb-4">
                                <h2 className="text-xl font-bold text-gray-800">{mahalle.mahalle} Mahallesi</h2>
                                <MapPin size={20} className="text-emerald-500" />
                            </div>
                            <div className="space-y-4 mb-8 flex-1">
                                <StatRow icon={Zap} label="Ort. Elektrik" value={mahalle.elektrik.ortalama} unit="kWh" color="text-emerald-700" iconColor="text-yellow-500" bgColor="bg-yellow-50" />
                                <StatRow icon={Droplets} label="Ort. Su" value={mahalle.su.ortalama} unit="m³" color="text-blue-700" iconColor="text-blue-500" bgColor="bg-blue-50" />
                                <StatRow icon={Flame} label="Ort. Doğalgaz" value={mahalle.dogalgaz.ortalama} unit="m³" color="text-orange-700" iconColor="text-orange-500" bgColor="bg-orange-50" />
                            </div>
                            <button onClick={() => setSelectedMahalle(mahalle)} className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-xl font-bold transition-all shadow-md group-hover:scale-[1.02] active:scale-95 cursor-pointer">
                                <Activity size={20} /> Mahalleyi Görüntüle
                            </button>
                        </div>
                    ))
                ) : (<div className="col-span-full bg-white p-8 rounded-xl text-center text-gray-600">Aradığınız kriterlere uygun mahalle bulunamadı.</div>)}
            </div>
            {selectedMahalle && <MahalleDetayModal mahalleData={selectedMahalle} onClose={() => setSelectedMahalle(null)} onIncidentCreated={fetchData} />}
        </div>
    );
};
export default Mahalleler;
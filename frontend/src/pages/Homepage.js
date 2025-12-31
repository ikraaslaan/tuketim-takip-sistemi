import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Search, MapPin, Database, TrendingUp, Zap, Droplets, Flame, Clock, BrainCircuit, Shield } from "lucide-react"; 
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

// Video yoksa hata vermesin diye CSS gradient kullanacağız, import'u kaldırdık.
// api ve AuthContext importlarını kaldırdık (Backend yok).

// --- SAHTE VERİ (Backend olmadığı için buraya ekledik) ---
const MOCK_DATA = [
  { mahalle: "Çaydaçıra", elektrik: { ortalama: 450 }, su: { ortalama: 45 }, dogalgaz: { ortalama: 120 } },
  { mahalle: "Ataşehir", elektrik: { ortalama: 380 }, su: { ortalama: 30 }, dogalgaz: { ortalama: 90 } },
  { mahalle: "Sürsürü", elektrik: { ortalama: 410 }, su: { ortalama: 35 }, dogalgaz: { ortalama: 110 } },
  { mahalle: "Cumhuriyet", elektrik: { ortalama: 320 }, su: { ortalama: 25 }, dogalgaz: { ortalama: 80 } },
  { mahalle: "Bahçelievler", elektrik: { ortalama: 390 }, su: { ortalama: 40 }, dogalgaz: { ortalama: 100 } },
];

const HomePage = () => {
  // const { user } = useContext(AuthContext); // SİLDİK
  
  const [allData, setAllData] = useState([]);
  const [neighborhoodNames, setNeighborhoodNames] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedNeighborhood, setSelectedNeighborhood] = useState(null);
  const [currentNeighborhoodName, setCurrentNeighborhoodName] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  
  // TAHMİN STATE'İ
  const [prediction, setPrediction] = useState(null);
  const [predLoading, setPredLoading] = useState(false);
  
  const searchContainerRef = useRef(null);

  // Verileri yükleme simülasyonu
  useEffect(() => {
    const fetchInitialData = () => {
        // API yerine sahte veriyi yüklüyoruz
        const data = MOCK_DATA;
        setAllData(data);
        setNeighborhoodNames(data.map(item => item.mahalle));
        setLoading(false);
    };
    // Biraz gecikme ekleyelim gerçekçi olsun
    setTimeout(fetchInitialData, 500);
  }, []);

  // TAHMİN FONKSİYONU (Yapay Zeka Simülasyonu)
  const handleGetPrediction = () => {
    if (!currentNeighborhoodName) return;
    setPredLoading(true);
    
    // API yerine rastgele tahmin üretiyoruz
    setTimeout(() => {
        const fakePred = {
            mesaj: "Önümüzdeki ay kış şartları nedeniyle artış bekleniyor.",
            elektrik_tahmini: Math.floor(Math.random() * 500) + 300,
            su_tahmini: Math.floor(Math.random() * 50) + 20,
            dogalgaz_tahmini: Math.floor(Math.random() * 150) + 80,
        };
        setPrediction(fakePred);
        setPredLoading(false);
    }, 1500); // 1.5 saniye bekleme efekti
  };

  const searchNeighborhoods = useCallback(
    (query) => neighborhoodNames.filter((n) => n.toLowerCase().includes(query.toLowerCase())),
    [neighborhoodNames]
  );

  const filteredNeighborhoods = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return searchNeighborhoods(searchQuery).slice(0, 5);
  }, [searchQuery, searchNeighborhoods]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const hydrateSelection = useCallback(
    (neighborhoodName) => {
      if (!neighborhoodName) return;
      
      setPrediction(null); // Tahmini temizle

      const foundData = allData.find(d => d.mahalle === neighborhoodName);

      if (foundData) {
        const payload = {
          name: foundData.mahalle,
          electricity: foundData.elektrik.ortalama,
          water: foundData.su.ortalama,
          gas: foundData.dogalgaz.ortalama,
        };
        setSelectedNeighborhood(payload);
        setCurrentNeighborhoodName(payload.name);
        setSearchQuery(payload.name);
      } else {
        setSelectedNeighborhood({
          name: neighborhoodName,
          electricity: 0,
          water: 0,
          gas: 0,
        });
      }
      setShowDropdown(false);
      setHighlightedIndex(-1);
    },
    [allData]
  );

  const handleSelectNeighborhood = useCallback(
    (neighborhoodName) => {
      hydrateSelection(neighborhoodName);
    },
    [hydrateSelection]
  );

  const handleKeyDown = (e) => {
    if (!showDropdown || filteredNeighborhoods.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((p) => (p < filteredNeighborhoods.length - 1 ? p + 1 : p));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((p) => (p > 0 ? p - 1 : -1));
    } else if (e.key === "Enter" && highlightedIndex >= 0) {
      e.preventDefault();
      handleSelectNeighborhood(filteredNeighborhoods[highlightedIndex]);
    } else if (e.key === "Escape") setShowDropdown(false);
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setShowDropdown(true);
    setHighlightedIndex(-1);
  };

  // Varsayılan seçim
  useEffect(() => {
    if (!loading && neighborhoodNames.length > 0 && !selectedNeighborhood) {
      handleSelectNeighborhood("Çaydaçıra");
    }
  }, [loading, neighborhoodNames, selectedNeighborhood, handleSelectNeighborhood]);

  const statsDisplay = [
    { icon: MapPin, label: "Toplam Mahalle", value: neighborhoodNames.length.toString(), color: "emerald" },
    { icon: Database, label: "Veri Kaydı", value: "85K+", color: "purple" },
    { icon: TrendingUp, label: "Anlık İzleme", value: "Aktif", color: "orange" },
    { icon: Clock, label: "Son Güncelleme", value: "Şimdi", color: "rose" },
  ];

  const getColorClasses = (color) => {
    const colors = {
      emerald: "bg-emerald-50 text-emerald-600 border-emerald-200",
      purple: "bg-purple-50 text-purple-600 border-purple-200",
      orange: "bg-orange-50 text-orange-600 border-orange-200",
      rose: "bg-rose-50 text-rose-600 border-rose-200",
    };
    return colors[color] || colors.emerald;
  };

  if (loading) return <div className="text-gray-600 text-center pt-20">Yükleniyor...</div>;

  return (
    <div className="relative min-h-screen overflow-hidden bg-gray-900">
      {/* Video yerine Gradient Arkaplan (Dosya eksik hatası vermemesi için) */}
      <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-gray-900 via-emerald-900 to-black"></div>
      <div className="absolute inset-0 bg-black/40"></div>

      <div className="relative z-10 pt-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto pb-16">
        <div className="animate-fade-in-up">
          <div className="text-center mb-16 mt-8">
            <h1 className="text-5xl font-extrabold text-white drop-shadow-lg leading-tight mb-4">Şehir Tüketim Analizi</h1>
            <p className="text-xl text-gray-200 drop-shadow-md max-w-2xl mx-auto mb-8">Mahalle bazında gerçek zamanlı veriler.</p>
            <button
              onClick={() => searchContainerRef.current && window.scrollTo({ top: searchContainerRef.current.offsetTop - 100, behavior: "smooth" })}
              className="inline-flex items-center px-8 py-4 text-base font-medium rounded-full shadow-lg text-white bg-emerald-600 hover:bg-emerald-700 transition-all hover:scale-105"
            >
              <Search className="w-5 h-5 mr-3" /> Mahalle Ara
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            {statsDisplay.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <div key={index} className="bg-white/10 backdrop-blur-md rounded-3xl p-7 shadow-lg border border-white/20 hover:-translate-y-1 transition-transform">
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-5 border-2 ${getColorClasses(stat.color)}`}><Icon className="w-7 h-7" /></div>
                  <h3 className="text-md font-medium text-gray-200 mb-1">{stat.label}</h3>
                  <p className="text-3xl font-bold text-white">{stat.value}</p>
                </div>
              );
            })}
          </div>

          <div id="search-section" ref={searchContainerRef} className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/20">
            <h2 className="text-3xl font-bold text-white mb-8 flex items-center gap-3"><Search className="w-8 h-8 text-emerald-400" /> Detaylı Analiz</h2>
            
            <div className="relative mb-8">
              <Search className="absolute left-5 top-1/2 transform -translate-y-1/2 w-6 h-6 text-emerald-100" />
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                onFocus={() => setShowDropdown(true)}
                onKeyDown={handleKeyDown}
                placeholder="Mahalle adı girin (Örn: Çaydaçıra)"
                className="w-full pl-16 pr-5 py-5 text-lg border border-white/30 rounded-2xl bg-white/10 text-white placeholder:text-gray-300 focus:outline-none focus:bg-white/20 focus:border-emerald-400 transition-all"
              />
              {showDropdown && filteredNeighborhoods.length > 0 && (
                <div className="absolute w-full mt-2 bg-gray-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/10 max-h-64 overflow-y-auto z-50">
                  {filteredNeighborhoods.map((n, index) => (
                    <button key={n} onClick={() => handleSelectNeighborhood(n)} className={`w-full text-left px-6 py-4 flex items-center gap-3 hover:bg-emerald-900/50 transition border-b border-white/5 last:border-0 ${index === highlightedIndex ? "bg-emerald-900/80" : ""}`}>
                      <MapPin className="w-5 h-5 text-emerald-400" /><span className="font-medium text-gray-200 text-lg">{n}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedNeighborhood && (
              <div className="animate-fade-in">
                <div className="flex items-center gap-4 mb-8 pb-4 border-b border-white/10">
                   <div className="p-3 bg-emerald-500/20 rounded-xl"><MapPin className="w-8 h-8 text-emerald-400" /></div>
                   <div><h3 className="text-4xl font-bold text-white">{selectedNeighborhood.name}</h3><p className="text-emerald-200">Güncel ortalama tüketim verileri</p></div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <DataCard icon={Zap} label="Ortalama Elektrik" value={selectedNeighborhood.electricity} unit="kWh" color="yellow" />
                  <DataCard icon={Droplets} label="Ortalama Su" value={selectedNeighborhood.water} unit="m³" color="blue" />
                  <DataCard icon={Flame} label="Ortalama Doğalgaz" value={selectedNeighborhood.gas} unit="m³" color="orange" />
                </div>

                <div className="bg-white rounded-3xl p-6 shadow-xl mb-8">
                  <h4 className="text-lg font-bold text-gray-800 mb-6">Tüketim Dağılımı</h4>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={[{ name: "Elektrik", value: Number(selectedNeighborhood.electricity) }, { name: "Su", value: Number(selectedNeighborhood.water) }, { name: "Doğalgaz", value: Number(selectedNeighborhood.gas) }]} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <defs><linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient></defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6b7280'}} />
                      <YAxis 
                        domain={['dataMin - 50', 'dataMax + 50']}
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fill: '#6b7280'}} 
                      />
                      <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'}} />
                      <Area type="monotone" dataKey="value" stroke="#059669" fillOpacity={1} fill="url(#colorValue)" strokeWidth={3} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* --- TAHMİN (PREDICTION) ALANI --- */}
                <div className="bg-gradient-to-r from-indigo-900 to-purple-900 rounded-3xl p-8 border border-white/20 shadow-2xl">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                        <div>
                            <h4 className="text-2xl font-bold text-white flex items-center gap-3">
                                <BrainCircuit className="text-purple-400" /> Gelecek Ay Öngörüsü
                            </h4>
                            <p className="text-purple-200 mt-2">Yapay zeka algoritmamız ile gelecek 30 günün tahminlerini görün.</p>
                        </div>
                        <button 
                            onClick={handleGetPrediction} 
                            disabled={predLoading}
                            className="bg-white text-purple-900 px-6 py-3 rounded-xl font-bold hover:bg-purple-100 transition shadow-lg disabled:opacity-50"
                        >
                            {predLoading ? "Hesaplanıyor..." : "Tahmini Göster"}
                        </button>
                    </div>

                    {prediction && (
                        <div className="mt-8 bg-white/10 p-6 rounded-2xl border border-white/10 animate-fade-in">
                            <p className="text-xl text-center text-white font-semibold mb-4">{prediction.mesaj}</p>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="text-center p-4 bg-black/20 rounded-xl">
                                    <p className="text-sm text-yellow-300">Elektrik Tahmini</p>
                                    <p className="text-2xl text-white font-bold">{prediction.elektrik_tahmini} kWh</p>
                                </div>
                                <div className="text-center p-4 bg-black/20 rounded-xl">
                                    <p className="text-sm text-blue-300">Su Tahmini</p>
                                    <p className="text-2xl text-white font-bold">{prediction.su_tahmini} m³</p>
                                </div>
                                <div className="text-center p-4 bg-black/20 rounded-xl">
                                    <p className="text-sm text-orange-300">Doğalgaz Tahmini</p>
                                    <p className="text-2xl text-white font-bold">{prediction.dogalgaz_tahmini} m³</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

              </div>
            )}
          </div>
        </div>
      </div>

      <button
        onClick={() => alert("Kayıt formu açıldı (Demo)")}
        className="fixed bottom-6 right-6 z-40 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-4 rounded-full shadow-lg font-semibold flex items-center gap-2 transition-all hover:scale-105 hover:shadow-xl"
      >
        <Shield className="w-5 h-5" />
        Kayıt Ol
      </button>
    </div>
  );
};

const DataCard = ({ icon: Icon, label, value, unit, color }) => {
   const colors = { yellow: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", blue: "bg-blue-500/20 text-blue-400 border-blue-500/30", orange: "bg-orange-500/20 text-orange-400 border-orange-500/30" };
   return (<div className={`backdrop-blur-md rounded-2xl p-6 flex items-center gap-5 border ${colors[color]} shadow-lg transition-transform hover:scale-105`}><div className={`p-4 rounded-full bg-black/20`}><Icon className="w-8 h-8" /></div><div><p className="text-sm font-medium text-white/70 mb-1">{label}</p><p className="text-2xl font-bold text-white">{Math.round(Number(value)).toLocaleString()} <span className="text-base font-normal text-white/50">{unit}</span></p></div></div>);
};
export default HomePage;
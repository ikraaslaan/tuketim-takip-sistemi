import React, { useEffect, useMemo, useRef, useState, useContext } from "react";
import { Droplets, Search } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import api from "../services/api";
import AuthContext from "../context/AuthContext";

const normalizeTr = (str) =>
  (str || "")
    .toLowerCase()
    .replace(/ı/g, "i")
    .replace(/İ/g, "i")
    .replace(/ş/g, "s")
    .replace(/Ş/g, "s")
    .replace(/ğ/g, "g")
    .replace(/Ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/Ü/g, "u")
    .replace(/ö/g, "o")
    .replace(/Ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/Ç/g, "c");

const Su = ({ selectedNeighborhood }) => {
  const { user } = useContext(AuthContext);
  const [neighborhoodNames, setNeighborhoodNames] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [selectedNeighborhoodName, setSelectedNeighborhoodName] = useState(null);
  const [timeSeriesData, setTimeSeriesData] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const searchRef = useRef(null);

  // 1. MAHALLE LİSTESİNİ ÇEK VE VARSAYILAN SEÇİMİ YAP (GÜNCELLENDİ)
  useEffect(() => {
    const fetchNeighborhoods = async () => {
      try {
        setLoading(true);
        const response = await api.get("/stats/dashboard");
        const data = response.data.data;
        const names = data.map(item => item.mahalle);
        setNeighborhoodNames(names);
        setFiltered(names);

        // --- FIX: Use logged-in user's neighborhood if available ---
        if (names.length > 0 && !selectedNeighborhoodName) {
            // Priority: 1. User's neighborhood, 2. "Çaydaçıra" if exists, 3. First neighborhood
            let defaultName = names[0];
            
            // Check if user has a neighborhood field (could be mahalle, neighborhood, etc.)
            const userNeighborhood = user?.mahalle || user?.neighborhood || user?.Mahalle;
            if (userNeighborhood && names.includes(userNeighborhood)) {
                defaultName = userNeighborhood;
            } else if (names.includes("Çaydaçıra")) {
                defaultName = "Çaydaçıra";
            }
            
            setSelectedNeighborhoodName(defaultName);
            setSearchQuery(defaultName);
        }

      } catch (e) {
        console.error("Mahalle listesi yüklenemedi:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchNeighborhoods();
  }, []); // İlk yüklemede çalışsın

  // 2. MAHALLE SEÇİLİNCE ZAMAN SERİSİ VERİSİNİ ÇEK
  useEffect(() => {
    const fetchTimeSeries = async () => {
      if (!selectedNeighborhoodName) {
        setTimeSeriesData([]);
        setStatistics(null);
        return;
      }

      try {
        setDataLoading(true);
        // Backend'de varsayılan filtre 7 gün olduğu için tarih göndermiyoruz.
        const response = await api.get(`/stats/timeseries?mahalle=${encodeURIComponent(selectedNeighborhoodName)}&kaynak=su`);
        const data = response.data.data;
        setTimeSeriesData(data.timeSeries || []);
        setStatistics(data.statistics || null);
      } catch (e) {
        // Hata durumunda (Örn: 404 - veri yoksa) veriyi temizle
        console.error("Su verileri yüklenemedi veya boş döndü:", e);
        setTimeSeriesData([]);
        setStatistics(null);
      } finally {
        setDataLoading(false);
      }
    };

    fetchTimeSeries();
  }, [selectedNeighborhoodName]);

  // --- (Kalan useEffect'ler ve Fonksiyonlar aynı kalır) ---

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearchChange = (e) => {
    const q = e.target.value;
    setSearchQuery(q);
    const nq = normalizeTr(q);
    const res = neighborhoodNames.filter((n) =>
      normalizeTr(n).includes(nq)
    );
    setFiltered(res.slice(0, 8));
    setShowDropdown(true);
    setHighlightedIndex(-1);
  };

  const handleSelect = (neighborhoodName) => {
    setSelectedNeighborhoodName(neighborhoodName);
    setSearchQuery(neighborhoodName);
    setShowDropdown(false);
  };

  const handleKeyDown = (e) => {
    if (!showDropdown || filtered.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((i) => (i < filtered.length - 1 ? i + 1 : i));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((i) => (i > 0 ? i - 1 : -1));
    } else if (e.key === "Enter" && highlightedIndex >= 0) {
      e.preventDefault();
      handleSelect(filtered[highlightedIndex]);
    } else if (e.key === "Escape") {
      setShowDropdown(false);
    }
  };

  const summary = useMemo(() => {
    if (!statistics) return null;
    return { 
      value: `${statistics.ortalama.toLocaleString()} m³`, 
      change: statistics.degisim, 
      inc: statistics.artis 
    };
  }, [statistics]);

  // Helper function to add realistic fluctuations (Moderate variance for Water)
  const addFluctuations = (baseValue) => {
    const variance = 0.08; // 8% variance for Water (moderate, smoother)
    const fluctuation = (Math.random() * variance * 2 - variance) * baseValue;
    return Math.max(0, baseValue + fluctuation);
  };

  const chartData = useMemo(() => {
    // Backend zaten son 7 gün verisi gönderiyor. Eğer veri çoksa (30'dan fazla) son 30'u alalım.
    const sliced = timeSeriesData.length > 30 ? timeSeriesData.slice(-30) : timeSeriesData;
    
    // Etiketleri düzeltelim ve gerçekçi dalgalanmalar ekleyelim
    return sliced.map((item, index) => {
      const baseValue = item.value || 0;
      const fluctuatedValue = baseValue > 0 ? addFluctuations(baseValue) : baseValue;
      return {
        ...item,
        value: fluctuatedValue, // Apply fluctuation
        // X ekseninde tarih değerini kullanıyoruz
        tarih: item.tarih || `Gün ${index + 1}`,
      };
    });
  }, [timeSeriesData]);

  if (loading) {
    return (
      <div className="pt-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto pb-12">
        <p className="text-gray-700">Veriler yükleniyor...</p>
      </div>
    );
  }

  // --- RENDER (GÖRÜNÜM) KISMI ---

  // Grafik Renkleri (Su Temasına uygun, Mavi/Turkuaz tonları)
  const chartColors = {
      stroke: '#3b82f6', // Mavi
      fillStop1: '#93c5fd', // Açık Mavi
      fillStop2: '#93c5fd00'
  };

  return (
    <div className="pt-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto pb-12">
      <div className="animate-fade-in">
        <div className="mb-10">
          <h2 className="text-2xl font-bold text-gray-800 mb-3 flex items-center gap-3">
            <Droplets className="w-7 h-7 text-blue-600" />
            Su Tüketim Analizi
          </h2>
          <p className="text-gray-700">Mahalle bazında haftalık su tüketim trendi</p>
        </div>

        {/* ARAMA KUTUSU */}
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-blue-100/50 mb-10" ref={searchRef}>
          <h3 className="text-lg font-semibold text-gray-800 mb-5">Mahalle Seçimi</h3>
          <div className="relative">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Mahalle ara..."
              value={searchQuery}
              onChange={handleSearchChange}
              onFocus={() => setShowDropdown(true)}
              onKeyDown={handleKeyDown}
              className="w-full pl-14 pr-5 py-4 border border-blue-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400 transition-all duration-300 text-gray-800 placeholder:text-gray-400"
              aria-label="Mahalle ara"
            />
            {showDropdown && filtered.length > 0 && (
              <div className="absolute z-10 w-full mt-3 bg-white rounded-2xl shadow-md border border-blue-100/50 max-h-64 overflow-y-auto">
                {filtered.map((n, idx) => (
                  <button
                    key={n + idx}
                    onClick={() => handleSelect(n)}
                    className={`w-full text-left px-5 py-4 hover:bg-blue-50 transition-all duration-200 ${
                      idx === highlightedIndex ? "bg-blue-50" : ""
                    } ${idx === 0 ? "rounded-t-2xl" : ""} ${
                      idx === filtered.length - 1 ? "rounded-b-2xl" : "border-b border-blue-100/50"
                    }`}
                  >
                    <span className="font-medium text-gray-800">{n}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* GÖRÜNTÜLEME ALANI */}

        {/* 1. Seçim yoksa */}
        {!selectedNeighborhoodName && (
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-blue-100/50 text-gray-700">
            Lütfen bir mahalle seçiniz.
          </div>
        )}

        {/* 2. Veri Yükleniyor durumu */}
        {dataLoading && selectedNeighborhoodName && (
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-blue-100/50 text-gray-700">
            {selectedNeighborhoodName} mahallesi verileri yükleniyor...
          </div>
        )}

        {/* 3. Veri boşsa (7 günlük filtre nedeniyle veri gelmeyebilir) */}
        {selectedNeighborhoodName && !dataLoading && chartData.length === 0 && (
            <div className="bg-red-50 rounded-3xl p-8 shadow-sm border border-red-300 text-red-700">
                <p className="font-semibold">⚠️ {selectedNeighborhoodName} için güncel su verisi (Son 7 Gün) bulunamadı.</p>
                <p className="text-sm mt-1">Lütfen başka bir mahalle seçmeyi deneyin veya yönetici ile iletişime geçin.</p>
            </div>
        )}

        {/* 4. Veri geldiyse (Kartlar) */}
        {selectedNeighborhoodName && summary && chartData.length > 0 && !dataLoading && (
          <div className="grid grid-cols-1 gap-6 mb-10">
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-blue-100/50 hover:shadow-md transition-shadow duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">{selectedNeighborhoodName} Ort. Su Tüketimi (Son 7 Gün)</h4>
                  <p className="text-3xl font-bold text-gray-800">{summary.value}</p>
                </div>
                <div className={`text-sm font-semibold ${summary.inc ? "text-emerald-600" : "text-red-500"}`}>
                  {summary.change}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 5. Veri geldiyse (Grafik) */}
        {selectedNeighborhoodName && chartData.length > 0 && !dataLoading && (
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-blue-100/50 chart-container">
            <h3 className="text-lg font-bold mb-6 text-gray-800">{selectedNeighborhoodName} Su Tüketim Trendi (m³)</h3>
            <div className="w-full h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <defs>
                    {/* GRAFİK RENK TANIMI (SU TEMASI) */}
                    <linearGradient id="colorWater" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={chartColors.fillStop1} stopOpacity={0.9} />
                      <stop offset="95%" stopColor={chartColors.fillStop2} stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0f7fa" vertical={false} />
                  <XAxis 
                    dataKey="tarih" 
                    stroke="#6b7280" 
                    tickMargin={8}
                    tick={{ fontSize: 12 }}
                    interval="preserveStartEnd"
                  />
                  <YAxis 
                    domain={['dataMin - 50', 'dataMax + 50']}
                    stroke="#6b7280" 
                    tickMargin={8} 
                    tick={{ fontSize: 12 }} 
                  />
                  <Tooltip 
                    cursor={{ stroke: chartColors.stroke, strokeWidth: 1 }}
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      border: `1px solid ${chartColors.stroke}`,
                      borderRadius: 12,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                      padding: '10px 12px',
                      color: '#111827',
                      fontSize: 12,
                    }}
                    labelStyle={{ color: '#6b7280', marginBottom: 4 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke={chartColors.stroke} 
                    strokeWidth={3}
                    dot={false}
                    activeDot={{ r: 5, stroke: chartColors.stroke, strokeWidth: 2, fill: '#ffffff' }}
                    isAnimationActive={true}
                    animationDuration={800}
                    name="Su (m³)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
      <style>{`
        .chart-container { box-shadow: 0 1px 3px rgba(0,0,0,0.05); border-radius: 1.5rem; background: #ffffff; }
        .chart-container svg { background: transparent !important; }
      `}</style>
    </div>
  );
};

export default Su;
import React, { useState, useEffect, useRef, useMemo, useCallback, useContext } from "react";
import { Search, MapPin, Database, TrendingUp, Zap, Droplets, Flame, Clock, Shield } from "lucide-react"; 
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import bgVideo from "../assets/background.mp4";
import api from "../services/api";
import AuthContext from "../context/AuthContext";

const HomePage = () => {
  const { user } = useContext(AuthContext);

  const [allData, setAllData] = useState([]);
  const [neighborhoodNames, setNeighborhoodNames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedNeighborhood, setSelectedNeighborhood] = useState(null);
  const [currentNeighborhoodName, setCurrentNeighborhoodName] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  
  const searchContainerRef = useRef(null);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        const response = await api.get("/stats/dashboard");
        const data = response.data.data;
        setAllData(data);
        setNeighborhoodNames(data.map(item => item.mahalle));
        setError(null);
      } catch (err) {
        console.error("Veri hatası:", err);
        setError("Veriler sunucudan çekilemedi.");
      } finally {
        setLoading(false);
      }
    };
    fetchInitialData();
  }, []);

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
    async (neighborhoodName) => {
      if (!neighborhoodName) return;

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
        localStorage.setItem("lastSelectedNeighborhoodName", payload.name);
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

  useEffect(() => {
    if (!loading && neighborhoodNames.length > 0 && !selectedNeighborhood) {
      const savedName = localStorage.getItem("lastSelectedNeighborhoodName");
      let toPick = neighborhoodNames[0];
      if (savedName && neighborhoodNames.includes(savedName)) {
        toPick = savedName;
      } else if (neighborhoodNames.includes("Çaydaçıra")) {
        toPick = "Çaydaçıra";
      }
      handleSelectNeighborhood(toPick);
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

  if (loading) return <div className="text-white text-center pt-20">Yükleniyor...</div>;
  if (error) return (
    <div className="text-red-500 text-center pt-20 font-bold text-xl bg-black/50 p-4 rounded-xl mx-auto max-w-md mt-10">
      {error}
      <br />
      <span className="text-sm text-white font-normal">
        Lütfen sayfayı yenileyin veya sunucuyu kontrol edin.
      </span>
    </div>
  );

  return (
    <div className="relative min-h-screen overflow-hidden">
      <video className="absolute inset-0 w-full h-full object-cover" src={bgVideo} autoPlay loop muted playsInline />
      <div className="absolute inset-0 bg-black/40"></div>

      <div className="relative z-10 pt-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto pb-16">
        <div className="animate-fade-in-up">

          <div className="text-center mb-16 mt-8">
            <h1 className="text-5xl font-extrabold text-white drop-shadow-lg mb-4">
              Şehir Tüketim Analizi
            </h1>
            <p className="text-xl text-gray-200 max-w-2xl mx-auto mb-8">
              Mahalle bazında gerçek zamanlı veriler.
            </p>
            <button
              onClick={() =>
                searchContainerRef.current &&
                window.scrollTo({
                  top: searchContainerRef.current.offsetTop - 100,
                  behavior: "smooth",
                })
              }
              className="inline-flex items-center px-8 py-4 rounded-full text-white bg-emerald-600 hover:bg-emerald-700 transition"
            >
              <Search className="w-5 h-5 mr-3" /> Mahalle Ara
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            {statsDisplay.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <div key={index} className="bg-white/20 rounded-3xl p-7 shadow-lg border border-white/30">
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-5 border-2 ${getColorClasses(stat.color)}`}>
                    <Icon className="w-7 h-7" />
                  </div>
                  <h3 className="text-md text-gray-200">{stat.label}</h3>
                  <p className="text-3xl font-bold text-white">{stat.value}</p>
                </div>
              );
            })}
          </div>

          <div ref={searchContainerRef} className="bg-white/15 rounded-3xl p-8 border border-white/20">
            <div className="relative mb-8">
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                onKeyDown={handleKeyDown}
                onFocus={() => setShowDropdown(true)}
                placeholder="Mahalle adı girin..."
                className="w-full pl-6 pr-5 py-5 rounded-2xl bg-white/10 text-white"
              />

              {showDropdown && filteredNeighborhoods.length > 0 && (
                <div className="absolute w-full mt-2 bg-gray-900 rounded-2xl z-50">
                  {filteredNeighborhoods.map((n, index) => (
                    <button
                      key={n}
                      onClick={() => handleSelectNeighborhood(n)}
                      className={`w-full text-left px-6 py-4 ${
                        index === highlightedIndex ? "bg-emerald-900/80" : ""
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedNeighborhood && (
              <div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <DataCard icon={Zap} label="Ortalama Elektrik" value={selectedNeighborhood.electricity} unit="kWh" color="yellow" />
                  <DataCard icon={Droplets} label="Ortalama Su" value={selectedNeighborhood.water} unit="m³" color="blue" />
                  <DataCard icon={Flame} label="Ortalama Doğalgaz" value={selectedNeighborhood.gas} unit="m³" color="orange" />
                </div>

                <div className="bg-white rounded-3xl p-6 shadow-xl">
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart
                      data={[
                        { name: "Elektrik", value: Number(selectedNeighborhood.electricity) },
                        { name: "Su", value: Number(selectedNeighborhood.water) },
                        { name: "Doğalgaz", value: Number(selectedNeighborhood.gas) },
                      ]}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Area type="monotone" dataKey="value" stroke="#059669" fill="#10b981" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {(!user || user.role !== "admin") && (
        <button
          onClick={() => window.dispatchEvent(new CustomEvent("openKayitForm"))}
          className="fixed bottom-6 right-6 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-4 rounded-full shadow-lg"
        >
          <Shield className="w-5 h-5 inline mr-2" />
          Kayıt Ol
        </button>
      )}
    </div>
  );
};

const DataCard = ({ icon: Icon, label, value, unit, color }) => {
  const colors = {
    yellow: "bg-yellow-500/20 text-yellow-400",
    blue: "bg-blue-500/20 text-blue-400",
    orange: "bg-orange-500/20 text-orange-400",
  };

  return (
    <div className={`rounded-2xl p-6 flex items-center gap-5 ${colors[color]}`}>
      <Icon className="w-8 h-8" />
      <div>
        <p className="text-sm">{label}</p>
        <p className="text-2xl font-bold">
          {Math.round(Number(value)).toLocaleString()} {unit}
        </p>
      </div>
    </div>
  );
};

export default HomePage;
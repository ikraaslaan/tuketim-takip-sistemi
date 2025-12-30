import React, { useState, useEffect, useRef, useMemo, useCallback, useContext } from "react";
import { Search, MapPin, Database, TrendingUp, Zap, Droplets, Flame, Clock, BrainCircuit, Shield } from "lucide-react"; 
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import bgVideo from "../assets/background.mp4";
import api from "../services/api";
import AuthContext from "../context/AuthContext";

const { user } = useContext(AuthContext);
const HomePage = () => {

  const [allData, setAllData] = useState([]);
  const [neighborhoodNames, setNeighborhoodNames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedNeighborhood, setSelectedNeighborhood] = useState(null);
  const [currentNeighborhoodName, setCurrentNeighborhoodName] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  
  // TAHMİN STATE'İ
  const [prediction, setPrediction] = useState(null);
  const [predLoading, setPredLoading] = useState(false);
  
  const searchContainerRef = useRef(null);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        const response = await api.get("/stats/dashboard");
        const data = response.data.data;
        setAllData(data);
        setNeighborhoodNames(data.map(item => item.mahalle));
        setError(null); // Başarılıysa hatayı temizle
      } catch (err) {
        console.error("Veri hatası:", err);
        setError("Veriler sunucudan çekilemedi.");
      } finally {
        setLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  // TAHMİN FONKSİYONU
  const handleGetPrediction = async () => {
    if (!currentNeighborhoodName) return;
    try {
      setPredLoading(true);
      const res = await api.get(`/predictions?mahalle=${currentNeighborhoodName}`);
      setPrediction(res.data.data);
    } catch (err) {
      alert("Tahmin oluşturulurken hata oluştu.");
    } finally {
      setPredLoading(false);
    }
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
    async (neighborhoodName) => {
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
  if (error) return <div className="text-red-500 text-center pt-20 font-bold text-xl bg-black/50 p-4 rounded-xl mx-auto max-w-md mt-10">{error} <br/> <span className="text-sm text-white font-normal">Lütfen sayfayı yenileyin veya sunucuyu kontrol edin.</span></div>;

  return (
    <View>
      <Text>Homepage</Text>
    </View>
  )
}

export default HomePage
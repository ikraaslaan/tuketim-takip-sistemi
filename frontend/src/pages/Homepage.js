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

  return (
    <View>
      <Text>Homepage</Text>
    </View>
  )
}

export default HomePage
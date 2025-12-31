import React, { useState, useEffect, useContext } from "react";
import Navbar from "./components/Navbar";
import HomePage from "./pages/HomePage"; 
import Elektrik from "./pages/Elektrik";
import Su from "./pages/Su";
import Dogalgaz from "./pages/Dogalgaz";
import Yonetici from "./pages/Yonetici";
import SubscriptionBox from "./components/SubscriptionBox";
import KayitForm from "./pages/KayitForm";
import AdminLogin from "./pages/AdminLogin";

// Admin Sayfaları - Yolların klasör yapınla eşleştiğinden emin ol
import Mahalleler from "./pages/yonetim/Mahalleler";
import ArizaYonetimi from "./pages/yonetim/ArizaYonetimi";
import KesintiOlustur from "./pages/yonetim/KesintiOlustur";
import AnalitikModuller from "./pages/yonetim/AnalitikModuller";

import "./App.css";
import { AnimatePresence, motion } from "framer-motion"; 
import { AlertTriangle, X } from "lucide-react"; 
import AuthContext from "./context/AuthContext";
import api from "./services/api"; // ✅ './src/services/api' değil, sadece './services/api' olmalı

/* =========================================================================
   SİSTEM BİLDİRİM ÇUBUĞU - ADMIN ONLY
   ========================================================================= */
const SystemAlertBar = () => {
  const { user } = useContext(AuthContext);
  const [alerts, setAlerts] = useState([]);
  const [visible, setVisible] = useState(true);

  const isAdmin = user && user.role === 'admin';

  const checkSystemStatus = async () => {
    try {
      const response = await api.get('/incidents/alerts'); 
      if (response.data.success && response.data.alerts.length > 0) {
        setAlerts(response.data.alerts);
        setVisible(true); 
      } else {
        setAlerts([]);
      }
    } catch (error) {
      console.error("Sistem durumu kontrol edilemedi:", error);
    }
  };

  useEffect(() => {
    if (!isAdmin) return;
    checkSystemStatus(); 
    const interval = setInterval(checkSystemStatus, 2000); 
    return () => clearInterval(interval);
  }, [isAdmin]);

  if (!isAdmin || alerts.length === 0 || !visible) return null;

  return (
    <div className="bg-red-600 text-white relative overflow-hidden z-[99999]">
      <div className="container mx-auto flex items-center justify-between py-2 px-4">
        <div className="flex items-center gap-2 font-bold shrink-0 bg-red-700 px-3 py-1 rounded-lg">
          <AlertTriangle size={20} className="animate-pulse text-yellow-300" />
          <span>SİSTEM UYARISI ({alerts.length})</span>
        </div>
        
        <div className="flex-1 overflow-hidden mx-4 relative h-6 flex items-center">
          <motion.div 
            className="whitespace-nowrap absolute"
            animate={{ x: ["0%", "-100%"] }} 
            transition={{ repeat: Infinity, duration: 30, ease: "linear" }} 
          >
             {alerts.map((alert, index) => (
                <span key={index} className="inline-block mr-16 font-medium text-red-100 text-lg">
                  <span className="font-bold text-white uppercase tracking-wider">⚠️ [{alert.mahalle || "Genel"}]</span> 
                  <span className="text-yellow-300 font-bold mx-2 uppercase">{alert.tur || "ARIZA"}:</span> 
                  {alert.mesaj || alert.aciklama}
                </span>
             ))}
          </motion.div>
        </div>

        <button onClick={() => setVisible(false)} className="bg-red-700 hover:bg-red-800 p-1 rounded-full transition-colors z-10">
          <X size={18} />
        </button>
      </div>
    </div>
  );
};

function App() {
  const [activeTab, setActiveTab] = useState("home");
  const [selectedNeighborhood, setSelectedNeighborhood] = useState(null);
  const { user, logout } = useContext(AuthContext);
  const isAdminAuthed = !!user;

  const handleAdminLogout = () => {
    logout();
    setActiveTab("home");
  };

  useEffect(() => {
    const handleOpenForm = () => setActiveTab("kayit");
    window.addEventListener("openKayitForm", handleOpenForm);
    return () => window.removeEventListener("openKayitForm", handleOpenForm);
  }, []);

  const renderContent = () => {
    switch (activeTab) {
      case "home": return <HomePage selectedNeighborhood={selectedNeighborhood} setSelectedNeighborhood={setSelectedNeighborhood} />;
      case "kayit": return <KayitForm />;
      case "elektrik": return <Elektrik selectedNeighborhood={selectedNeighborhood} />;
      case "su": return <Su selectedNeighborhood={selectedNeighborhood} />;
      case "dogalgaz": return <Dogalgaz selectedNeighborhood={selectedNeighborhood} />;
      case "mahalleler": return isAdminAuthed ? <Mahalleler /> : <AdminLogin />;
      case "arizalar": return isAdminAuthed ? <ArizaYonetimi /> : <AdminLogin />;
      case "planli_kesinti": return isAdminAuthed ? <KesintiOlustur /> : <AdminLogin />;
      case "yonetici": return isAdminAuthed ? <Yonetici onLogout={handleAdminLogout} /> : <AdminLogin />;
      case "analitik": return isAdminAuthed ? <AnalitikModuller /> : <AdminLogin />;
      default: return <HomePage selectedNeighborhood={selectedNeighborhood} setSelectedNeighborhood={setSelectedNeighborhood} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#DDEEE3] relative flex flex-col">
      <div className="sticky top-0 left-0 right-0 z-[9999] w-full flex flex-col">
        <SystemAlertBar />
        <div className="w-full bg-[#DDEEE3]/90 backdrop-blur-md border-b border-white/20"> 
          <Navbar activeTab={activeTab} setActiveTab={setActiveTab} onLogout={handleAdminLogout} isAdminAuthed={isAdminAuthed} />
        </div>
      </div>
      
      <div className="flex-1 relative z-0"> 
        <AnimatePresence mode="wait">
          {renderContent()}
        </AnimatePresence>
      </div>
      
      {!isAdminAuthed && activeTab !== "yonetici" && (
        <div className="fixed bottom-4 right-4 z-50">
          <SubscriptionBox /> 
        </div>
      )}
    </div>
  );
}

export default App;
import React, { useState, useEffect, useContext } from "react"; // ✅ Burası kalacak
import api from "./services/api"; 
import Navbar from "./components/Navbar";
import HomePage from "./pages/HomePage";
import Elektrik from "./pages/Elektrik";
import Su from "./pages/Su";
import Dogalgaz from "./pages/Dogalgaz";
import Yonetici from "./pages/Yonetici";
import SubscriptionBox from "./components/SubscriptionBox";
import KayitForm from "./pages/KayitForm";
import AdminLogin from "./pages/AdminLogin";

import Mahalleler from "./pages/yonetim/Mahalleler";
import ArizaYonetimi from "./pages/yonetim/ArizaYonetimi";
import KesintiOlustur from "./pages/yonetim/KesintiOlustur";
import AnalitikModuller from "./pages/yonetim/AnalitikModuller";

import "./App.css";
import { AnimatePresence, motion } from "framer-motion"; 
import { AlertTriangle, X } from "lucide-react"; 
import AuthContext from "./context/AuthContext";
/* =========================================================================
   SİSTEM BİLDİRİM ÇUBUĞU (HIZLANDIRILDI) - ADMIN ONLY
   ========================================================================= */
const SystemAlertBar = () => {
  const { user } = useContext(AuthContext);
  const [alerts, setAlerts] = useState([]);
  const [visible, setVisible] = useState(true);

  // Only show for admins
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
    // Only check system status if user is admin
    if (!isAdmin) return;
    
    checkSystemStatus(); 
    // --- DÜZELTME 1: GÜNCELLEME SIKLIĞI ARTIRILDI ---
    // Eskiden 10000 (10sn) idi, şimdi 2000 (2sn). 
    // Python hata bulduğu an ekranda belirecek.
    const interval = setInterval(checkSystemStatus, 2000); 
    return () => clearInterval(interval);
  }, [isAdmin]);

  // Hide for non-admin users
  if (!isAdmin || alerts.length === 0 || !visible) return null;

  return (
    <div className="bg-red-600 text-white relative overflow-hidden z-[99999]">
      <div className="container mx-auto flex items-center justify-between py-2 px-4">
        <div className="flex items-center gap-2 font-bold shrink-0 bg-red-700 px-3 py-1 rounded-lg z-10">
          <AlertTriangle size={20} className="animate-pulse text-yellow-300" />
          <span>SİSTEM UYARISI ({alerts.length})</span>
        </div>
        
        <div className="flex-1 overflow-hidden mx-4 relative h-6 flex items-center">
          <motion.div 
            className="whitespace-nowrap absolute"
            animate={{ x: ["0%", "-100%"] }} 
            // --- DÜZELTME 2: AKIŞ HIZI ARTIRILDI ---
            // duration: 60 çok yavaştı, 30 yaptık. Daha seri akacak.
            transition={{ repeat: Infinity, duration: 30, ease: "linear" }} 
          >
             {alerts.map((alert, index) => {
                const mahalle = alert.Mahalle || alert.mahalle || "Bilinmeyen Mahalle";
                const kaynak = alert.Kaynak || alert.tur || alert.Kaynak_Tipi || "Genel";
                const mesaj = alert.Mesaj || alert.aciklama || alert.Aciklama || "Arıza detayı yok";

                return (
                  <span key={index} className="inline-block mr-16 font-medium text-red-100 text-lg">
                    <span className="font-bold text-white uppercase tracking-wider">⚠️ [{mahalle}]</span> 
                    <span className="text-yellow-300 font-bold mx-2 uppercase">{kaynak} ARIZASI:</span> 
                    {mesaj}
                  </span>
                );
             })}
          </motion.div>
        </div>

        <button 
          onClick={() => setVisible(false)} 
          className="bg-red-700 hover:bg-red-800 p-1 rounded-full transition-colors z-10"
        >
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
      case "home":
        return <HomePage key="home" selectedNeighborhood={selectedNeighborhood} setSelectedNeighborhood={setSelectedNeighborhood} />;
      case "kayit":
        return <KayitForm key="kayit" />;
      case "elektrik":
        return <Elektrik key="elektrik" selectedNeighborhood={selectedNeighborhood} />;
      case "su":
        return <Su key="su" selectedNeighborhood={selectedNeighborhood} />;
      case "dogalgaz":
        return <Dogalgaz key="dogalgaz" selectedNeighborhood={selectedNeighborhood} />;
      case "mahalleler":
        return isAdminAuthed ? <Mahalleler key="mahalleler" /> : <AdminLogin />;
      case "arizalar":
        return isAdminAuthed ? <ArizaYonetimi key="arizalar" /> : <AdminLogin />;
      case "planli_kesinti":
        return isAdminAuthed ? <KesintiOlustur key="planli_kesinti" /> : <AdminLogin />;
      case "yonetici":
        return isAdminAuthed ? <Yonetici key="yonetici" onLogout={handleAdminLogout} /> : <AdminLogin />;
      case "analitik":
        return isAdminAuthed ? <AnalitikModuller /> : <AdminLogin />;
      default:
        return <HomePage key="home-default" selectedNeighborhood={selectedNeighborhood} setSelectedNeighborhood={setSelectedNeighborhood} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#DDEEE3] relative flex flex-col">
      <div className="sticky top-0 left-0 right-0 z-[9999] w-full flex flex-col">
        <div className="relative z-20 w-full">
          <SystemAlertBar /> {/* Only visible to admins */}
        </div>
        <div className="relative z-10 w-full bg-[#DDEEE3]/90 backdrop-blur-md border-b border-white/20"> 
          <Navbar
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            onLogout={handleAdminLogout}
            isAdminAuthed={isAdminAuthed}
          />
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
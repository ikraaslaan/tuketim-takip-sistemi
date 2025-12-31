import React, { useState } from "react";
import { Menu, X, Home, Zap, Droplets, Flame, Shield, LogOut, Map, AlertTriangle, CalendarPlus } from "lucide-react";
import icon from "../images/icon.jpg";
import { TrendingUp } from "lucide-react";


const Navbar = ({ activeTab, setActiveTab, onLogout, isAdminAuthed }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // --- RENK AYARI MANTIĞI (Arkadaşının eklediği harika özellik) ---
  // Yönetici paneli sayfalarındaysak yazılar YEŞİL, değilse (Anasayfa vb.) BEYAZ olsun.
  // Çünkü yönetici panelinin arka planı beyaz, anasayfanınki video/koyu.
  const adminPages = ["yonetici", "mahalleler", "arizalar", "planli_kesinti"];
  const isDarkText = adminPages.includes(activeTab);

  // Dinamik Renk Sınıfları
  const textColorClass = isDarkText ? "text-emerald-900" : "text-white";
  const hoverClass = isDarkText ? "hover:bg-emerald-100 hover:text-emerald-900" : "hover:bg-white/15 hover:text-emerald-300";
  const logoSubColor = isDarkText ? "text-emerald-600" : "text-emerald-400";
  const mobileButtonColor = isDarkText ? "text-emerald-900" : "text-white";

  // 1. Durum: Normal Kullanıcı Menüsü
  const guestMenuItems = [
    { id: "home", label: "Anasayfa", Icon: Home },
    { id: "elektrik", label: "Elektrik", Icon: Zap },
    { id: "su", label: "Su", Icon: Droplets },
    { id: "dogalgaz", label: "Doğalgaz", Icon: Flame },
    { id: "yonetici", label: "Yönetici", Icon: Shield },
  ];

  // 2. Durum: Yönetici Giriş Yapmış Menüsü
  const adminMenuItems = [
    { id: "home", label: "Anasayfa", Icon: Home },
    { id: "mahalleler", label: "Mahalleler", Icon: Map },
    { id: "analitik", label: "Analitik Modüller", Icon: TrendingUp },
    { id: "arizalar", label: "Arıza ve Kesintiler", Icon: AlertTriangle },
    { id: "planli_kesinti", label: "Planlı Kesinti Oluştur", Icon: CalendarPlus },
    { id: "yonetici", label: "Yönetici", Icon: Shield },
  ];

  // Eğer yönetici ise admin menüsünü, değilse misafir menüsünü göster
  const currentMenuItems = isAdminAuthed ? adminMenuItems : guestMenuItems;
  
  const isActive = (id) => activeTab === id;

  const handleNavigation = (id) => {
    if (id === "yonetici" && !isAdminAuthed) {
      setActiveTab("yonetici"); 
    } else {
      setActiveTab(id); 
    }
    setIsMobileMenuOpen(false);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-white/10 border-b border-white/20 shadow-sm transition-all duration-300">
      <div className="w-full px-6 sm:px-8 lg:px-12">
        <div className="flex items-center h-20">
          
          {/* Sol Logo + Başlık */}
          <div
            className="flex items-center gap-3 select-none cursor-pointer group"
            onClick={() => setActiveTab("home")}
          >
            <img
              src={icon}
              alt="Logo"
              className="h-11 w-11 rounded-lg object-cover shadow-md group-hover:scale-105 transition-transform"
            />
            {/* Logo Yazısı Rengi Dinamik */}
            <h1 className={`text-2xl sm:text-3xl font-bold tracking-wide drop-shadow-sm whitespace-nowrap transition-colors duration-300 ${textColorClass}`}>
              Kentsel <span className={logoSubColor}>Tüketim</span> Analizi
            </h1>
          </div>

          <div className="flex-1"></div>

          {/* Sağ Menü (Desktop) */}
          <div className="hidden md:flex items-center space-x-6 pr-1">
            {currentMenuItems.map(({ id, label, Icon }) => {
              const active = isActive(id);
              
              // Aktif buton stili
              const activeStyle = "bg-emerald-600 text-white shadow-lg scale-[1.05]";
              // Pasif buton stili (Dinamik: Ya beyaz ya yeşil)
              const inactiveStyle = `${textColorClass} ${hoverClass}`;

              return (
                <button
                  key={id}
                  onClick={() => handleNavigation(id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all duration-300 
                  ${active ? activeStyle : inactiveStyle}`}
                >
                  <Icon className={`w-5 h-5 ${active ? "text-white" : ""}`} />
                  {label}
                </button>
              );
            })}

            {/* Çıkış Yap Butonu */}
            {isAdminAuthed && (
              <button
                onClick={onLogout}
                className="flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium text-white bg-red-500 hover:bg-red-600 transition-all duration-300 shadow-md ml-4"
              >
                <LogOut className="w-5 h-5" />
                Çıkış Yap
              </button>
            )}
          </div>

          {/* Mobil Menü Butonu (Rengi Dinamik) */}
          <button
            className={`md:hidden transition duration-200 ml-3 ${mobileButtonColor} hover:opacity-80`}
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="w-7 h-7" /> : <Menu className="w-7 h-7" />}
          </button>
        </div>
      </div>

      {/* Mobil Menü */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 bg-black/30 z-40">
          <div className="absolute top-0 right-0 p-6 w-3/4 bg-white/95 backdrop-blur-xl h-full shadow-2xl overflow-y-auto">
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="absolute top-4 right-4 text-2xl text-emerald-900 hover:text-red-500 transition-colors"
            >
              <X />
            </button>
            <ul className="mt-12 space-y-3">
              {currentMenuItems.map(({ id, label, Icon }) => {
                const active = isActive(id);
                return (
                  <li key={id}>
                    <button
                      onClick={() => handleNavigation(id)}
                      className={`flex items-center gap-3 px-5 py-4 rounded-2xl text-base font-bold transition-all duration-300 w-full
                      ${active ? "bg-emerald-600 text-white shadow-lg" : 
                      "text-emerald-900 hover:bg-emerald-50"}`}
                    >
                      <Icon className="w-6 h-6" />
                      {label}
                    </button>
                  </li>
                );
              })}
              
              {isAdminAuthed && (
                <li>
                  <button
                    onClick={() => {
                        onLogout();
                        setIsMobileMenuOpen(false);
                    }}
                    className="flex items-center gap-3 px-5 py-4 rounded-2xl text-base font-bold text-white bg-red-500 hover:bg-red-600 w-full transition-all duration-300 mt-6 shadow-md"
                  >
                    <LogOut className="w-6 h-6" />
                    Çıkış Yap
                  </button>
                </li>
              )}
            </ul>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
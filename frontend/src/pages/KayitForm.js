import React, { useState, useEffect, useMemo, useCallback } from "react";
import bgVideo from "../assets/background.mp4";
import { ArrowLeft, Search } from "lucide-react"; 
import api from "../services/api";

const KayitForm = () => {
  const [name, setName] = useState("");
  const [surname, setSurname] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [email, setEmail] = useState("");
  const [showList, setShowList] = useState(false);
  
  // Mahalle listesi ve yükleme durumu
  const [neighborhoods, setNeighborhoods] = useState([]);
  const [loadingNeighborhoods, setLoadingNeighborhoods] = useState(true);

  // --- 1. MAHALLE LİSTESİNİ API'DEN ÇEKME ---
  useEffect(() => {
    const fetchNeighborhoods = async () => {
      try {
        setLoadingNeighborhoods(true);
        const response = await api.get("/stats/dashboard"); 
        const names = response.data.data.map(item => item.mahalle);
        setNeighborhoods(names);
      } catch (e) {
        console.error("Mahalle listesi API'den çekilemedi:", e);
        setNeighborhoods([]);
      } finally {
        setLoadingNeighborhoods(false);
      }
    };
    fetchNeighborhoods();
  }, []);

  // --- 2. FİLTRELEME MANTIĞI ---
  const filteredNeighborhoods = useMemo(() => {
    if (loadingNeighborhoods) return [];
    if (!neighborhood.trim() && showList) return neighborhoods;
    
    const query = neighborhood.toLowerCase();
    return neighborhoods.filter((m) =>
      m.toLowerCase().includes(query)
    );
  }, [neighborhood, neighborhoods, loadingNeighborhoods, showList]);

  const handleSelectNeighborhood = useCallback((m) => {
    setNeighborhood(m); 
    setShowList(false);
  }, []);

  const handleNeighborhoodChange = (e) => {
    setNeighborhood(e.target.value); 
    setShowList(true);
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !surname || !email || !neighborhood.trim()) {
      alert("Lütfen tüm alanları doldurunuz.");
      return;
    }
    if (!neighborhoods.includes(neighborhood.trim())) {
        alert("Lütfen listede bulunan geçerli bir mahalle adı girin veya listeden seçin.");
        return;
    }
    
    // Doğrulama sistemi henüz eklenmediği için geçici alert
    alert("Doğrulama sistemi bir sonraki güncellemede eklenecek.");
  };

  if (loadingNeighborhoods) {
      return (
        <div className="relative min-h-screen flex items-center justify-center bg-black/80 text-white z-20">
             <p>Mahalle listesi yükleniyor...</p>
        </div>
      );
  }

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-start px-4 py-10 overflow-hidden">
      <video autoPlay loop muted playsInline className="absolute top-0 left-0 w-full h-full object-cover z-0">
        <source src={bgVideo} type="video/mp4" />
      </video>
      <div className="absolute inset-0 bg-black/35 z-10"></div>

       <button onClick={() => (window.location.href = "/")} className="flex items-center gap-2 text-white drop-shadow-md hover:text-gray-200 self-start mb-8 z-20">
        <ArrowLeft className="w-5 h-5" /> Geri Dön
      </button>

      <div className="bg-white/10 backdrop-blur-md border border-white/30 text-white rounded-2xl p-8 w-full max-w-lg mt-20 z-20">
        <h2 className="text-2xl font-bold text-white mb-4 text-center">Kayıt Formu</h2>
        <p className="text-center text-white/90 mb-8">Mahallenizdeki kesintilerden mail yoluyla haberdar olun.</p>

        <form onSubmit={handleSubmit} className="space-y-5">
           <div>
            <label className="text-sm font-medium text-white">Adınız</label>
            <input className="w-full bg-white/10 text-white placeholder-white/60 px-4 py-3 rounded-xl border border-white/40" placeholder="Adınız" value={name} onChange={(e) => setName(e.target.value)} />
           </div>
           
           <div>
            <label className="text-sm font-medium text-white">Soyadınız</label>
            <input className="w-full bg-white/10 text-white placeholder-white/60 px-4 py-3 rounded-xl border border-white/40" placeholder="Soyadınız" value={surname} onChange={(e) => setSurname(e.target.value)} />
           </div>
           
           <div className="relative">
            <label className="text-sm font-medium text-white">Mahalleniz</label>
            <div className="relative flex items-center">
                <input type="text" className="w-full bg-white/10 text-white placeholder-white/60 px-4 py-3 pl-10 rounded-xl border border-white/40" placeholder="Mahalle ara" value={neighborhood} onChange={handleNeighborhoodChange} onFocus={() => setShowList(true)} onBlur={() => setTimeout(() => setShowList(false), 200)} />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/60" />
            </div>
            
            {showList && filteredNeighborhoods.length > 0 && (
              <ul className="absolute left-0 right-0 bg-gray-900 text-white border border-white/30 rounded-xl mt-1 max-h-40 overflow-y-auto z-30">
                {filteredNeighborhoods.map((m, i) => (
                  <li key={i} onClick={() => handleSelectNeighborhood(m)} className="px-4 py-2 cursor-pointer hover:bg-white/20">
                    {m}
                  </li>
                ))}
              </ul>
            )}
           </div>

           <div>
            <label className="text-sm font-medium text-white">E-postanız</label>
            <input type="email" className="w-full bg-white/10 text-white placeholder-white/60 px-4 py-3 rounded-xl border border-white/40" placeholder="ornek@gmail.com" value={email} onChange={(e) => setEmail(e.target.value)} />
           </div>

           <button type="submit" className="w-full bg-emerald-600 text-white py-3 rounded-xl font-semibold hover:bg-emerald-700 transition-all">
             Abone Ol
           </button>
        </form>
      </div>
    </div>
  );
};

export default KayitForm;
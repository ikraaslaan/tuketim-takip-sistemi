import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { MapPin, Zap, Droplets, Flame, Activity, X, Search } from 'lucide-react';
import api from '../../services/api'; 

/* =========================================================================
   YARDIMCI KOMPONENTLER
   ========================================================================= */
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

const KaynakKarti = ({ title, icon: Icon, color, isSelected, onClick }) => {
    const colors = { 
        yellow: { bg: "bg-yellow-100", text: "text-yellow-600", border: "border-yellow-200" }, 
        blue: { bg: "bg-blue-100", text: "text-blue-600", border: "border-blue-200" }, 
        orange: { bg: "bg-orange-100", text: "text-orange-600", border: "border-orange-200" } 
    };
    const activeColor = colors[color] || colors.yellow;
    
    return (
        <div 
            onClick={onClick}
            className={`cursor-pointer p-6 rounded-2xl border-2 transition-all flex flex-col items-center text-center h-full justify-between
            ${isSelected ? `${activeColor.border} bg-white shadow-lg scale-105` : 'border-transparent bg-gray-50 hover:bg-gray-100'}`}
        >
            <div className="w-full flex flex-col items-center mb-2">
                <div className={`p-4 rounded-full mb-3 ${activeColor.bg}`}>
                    <Icon className={activeColor.text} size={32} />
                </div>
                <h3 className={`font-bold text-xl ${isSelected ? 'text-gray-800' : 'text-gray-500'}`}>{title}</h3>
            </div>
        </div>
    );
};

/* =========================================================================
   MAHALLE DETAY MODAL (PLACEHOLDER)
   ========================================================================= */
const MahalleDetayModal = ({ mahalleData, onClose, onIncidentCreated }) => {
    return <div>MahalleDetayModal placeholder</div>;
};

/* =========================================================================
   ANA SAYFA
   ========================================================================= */
const Mahalleler = () => {
    const [mahalleler, setMahalleler] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedMahalle, setSelectedMahalle] = useState(null); 
    const [searchQuery, setSearchQuery] = useState('');

    const fetchData = useCallback(async () => {
        try {
            setMahalleler(prev => { if(prev.length === 0) setLoading(true); return prev; });
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

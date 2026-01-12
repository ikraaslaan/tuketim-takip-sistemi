import React, { useState, useEffect } from "react";
import { FileText, TrendingUp, BarChart3, Activity } from "lucide-react";
import api from "../../services/api";

// Hooks
import { useDocuments } from "./hooks/useDocuments";
import { useStatisticalSummary } from "./hooks/useStatisticalSummary";
import { useTimeSeriesAnalysis } from "./hooks/useTimeSeriesAnalysis";
import { useCorrelationAnalysis } from "./hooks/useCorrelationAnalysis";
import { useReportGeneration } from "./hooks/useReportGeneration";

// Components
import BelgelerListesi from "./components/BelgelerListesi";
import RaporFormu from "./components/RaporFormu";
import IstatistikOzeti from "./components/IstatistikOzeti";
import ZamanSerisiAnalizi from "./components/ZamanSerisiAnalizi";
import KorelasyonAnalizi from "./components/KorelasyonAnalizi";

const AnalitikModuller = () => {
  const [activePage, setActivePage] = useState("belgeler");
  
  // Smart Date Filter: Default to previous month
  const today = new Date();
  const currentMonth = today.getMonth() + 1;
  const currentYear = today.getFullYear();
  const previousMonth = currentMonth === 1 ? 12 : currentMonth - 1;
  const previousYear = currentMonth === 1 ? currentYear - 1 : currentYear;
  
  const [selectedMonth, setSelectedMonth] = useState(previousMonth);
  const [selectedYear, setSelectedYear] = useState(previousYear);
  
  // Auto-fix invalid month selection
  useEffect(() => {
    const today = new Date();
    const currentMonthNum = today.getMonth() + 1;
    const currentYearNum = today.getFullYear();
    
    if (selectedYear === currentYearNum && selectedMonth >= currentMonthNum) {
      const prevMonth = currentMonthNum === 1 ? 12 : currentMonthNum - 1;
      console.log(`🔄 Auto-fixing invalid month selection: ${selectedMonth} -> ${prevMonth}`);
      setSelectedMonth(prevMonth);
    }
  }, [selectedYear, selectedMonth]);
  
  // Filter states for report generation
  const [neighborhoods, setNeighborhoods] = useState([]);
  const [selectedNeighborhood, setSelectedNeighborhood] = useState("");
  const [selectedResource, setSelectedResource] = useState("all");
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  // Korelasyon analizi için ayrı state'ler
  const [correlationNeighborhood, setCorrelationNeighborhood] = useState("");
  const [correlationMonth, setCorrelationMonth] = useState(null);
  const [correlationSeason, setCorrelationSeason] = useState(null);
  const [correlationYear, setCorrelationYear] = useState(new Date().getFullYear());

  // Custom hooks
  const { documents, loading: documentsLoading, fetchDocuments } = useDocuments(activePage);
  const { statisticalSummary, loading: statsLoading } = useStatisticalSummary(activePage, selectedMonth, selectedYear);
  const { timeSeriesAnalysis, loading: timeSeriesLoading } = useTimeSeriesAnalysis(activePage, selectedYear);
  const { correlationAnalysis, loading: correlationLoading } = useCorrelationAnalysis(
    activePage, 
    correlationYear, 
    correlationMonth,
    correlationSeason,
    correlationNeighborhood
  );
  
  const {
    generatingReport,
    reportProgress,
    showSuccessToast: reportSuccessToast,
    successMessage: reportSuccessMessage,
    setShowSuccessToast: setReportSuccessToast,
    generateReport
  } = useReportGeneration(fetchDocuments);

  // Fetch neighborhoods list
  useEffect(() => {
    const fetchNeighborhoods = async () => {
      try {
        const response = await api.get("/stats/dashboard");
        if (response.data && response.data.success) {
          const names = response.data.data.map(item => item.mahalle);
          setNeighborhoods(names);
          if (names.length > 0 && !selectedNeighborhood) {
            setSelectedNeighborhood(names[0]);
          }
        }
      } catch (error) {
        console.error("Mahalle listesi yüklenemedi:", error);
        setNeighborhoods([]);
      }
    };
    fetchNeighborhoods();
  }, []);


  // Handle report generation
  const handleGenerateReport = () => {
    generateReport(selectedNeighborhood, selectedResource, selectedMonth, selectedYear);
  };

  // Combine success toasts
  const displayToast = showSuccessToast || reportSuccessToast;
  const displayMessage = successMessage || reportSuccessMessage;

  return (
    <div className="pt-24 px-8 min-h-screen bg-[#DDEEE3]">
      {/* SUCCESS TOAST NOTIFICATION */}
      {displayToast && (
        <div className="fixed top-20 right-8 z-50 animate-slide-in">
          <div className="bg-emerald-600 text-white px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 min-w-[300px]">
            <div className="flex-1">
              <p className="font-semibold">{displayMessage}</p>
            </div>
            <button
              onClick={() => {
                setShowSuccessToast(false);
                setReportSuccessToast(false);
              }}
              className="text-white hover:text-emerald-100 transition"
            >
              ✕
            </button>
          </div>
        </div>
      )}
      
      {/* ANALİTİK MODÜLLER ÜST MENÜ */}
      <div className="flex gap-4 mb-8 flex-wrap">
        <button
          onClick={() => setActivePage("belgeler")}
          className={`px-6 py-2 rounded-full font-bold transition-all
            ${
              activePage === "belgeler"
                ? "bg-emerald-600 text-white shadow"
                : "bg-white text-emerald-700 hover:bg-emerald-100"
            }`}
        >
          <FileText className="inline-block mr-2" size={18} />
          Belgeler
        </button>

        <button
          onClick={() => setActivePage("istatistik")}
          className={`px-6 py-2 rounded-full font-bold transition-all
            ${
              activePage === "istatistik"
                ? "bg-emerald-600 text-white shadow"
                : "bg-white text-emerald-700 hover:bg-emerald-100"
            }`}
        >
          <TrendingUp className="inline-block mr-2" size={18} />
          İstatistik Özeti
        </button>

        <button
          onClick={() => setActivePage("zaman")}
          className={`px-6 py-2 rounded-full font-bold transition-all
            ${
              activePage === "zaman"
                ? "bg-emerald-600 text-white shadow"
                : "bg-white text-emerald-700 hover:bg-emerald-100"
            }`}
        >
          <BarChart3 className="inline-block mr-2" size={18} />
          Zaman Serisi Analizi
        </button>

        <button
          onClick={() => setActivePage("korelasyon")}
          className={`px-6 py-2 rounded-full font-bold transition-all
            ${
              activePage === "korelasyon"
                ? "bg-emerald-600 text-white shadow"
                : "bg-white text-emerald-700 hover:bg-emerald-100"
            }`}
        >
          <Activity className="inline-block mr-2" size={18} />
          Korelasyon Analizi
        </button>
      </div>

      {/* SAYFA İÇERİĞİ */}
      <div className="bg-white rounded-2xl p-10 shadow-lg">
        {/* BELGELER SAYFASI */}
        {activePage === "belgeler" && (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3 mb-4">
                <FileText className="text-emerald-600" />
                PDF Belgeler
              </h2>
            </div>

            <BelgelerListesi
              documents={documents}
              loading={documentsLoading}
              onRefresh={fetchDocuments}
            />
          </div>
        )}

        {/* İSTATİSTİK ÖZETİ SAYFASI */}
        {activePage === "istatistik" && (
          <div>
            <RaporFormu
              neighborhoods={neighborhoods}
              selectedNeighborhood={selectedNeighborhood}
              setSelectedNeighborhood={setSelectedNeighborhood}
              selectedResource={selectedResource}
              setSelectedResource={setSelectedResource}
              selectedMonth={selectedMonth}
              setSelectedMonth={setSelectedMonth}
              selectedYear={selectedYear}
              setSelectedYear={setSelectedYear}
              generatingReport={generatingReport}
              reportProgress={reportProgress}
              onGenerate={handleGenerateReport}
            />
            
            <IstatistikOzeti
              loading={statsLoading}
              statisticalSummary={statisticalSummary}
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
              onMonthChange={setSelectedMonth}
              onYearChange={setSelectedYear}
            />
          </div>
        )}

        {/* ZAMAN SERİSİ ANALİZİ SAYFASI */}
        {activePage === "zaman" && (
          <ZamanSerisiAnalizi
            loading={timeSeriesLoading}
            timeSeriesAnalysis={timeSeriesAnalysis}
            selectedYear={selectedYear}
            onYearChange={setSelectedYear}
          />
        )}

        {/* KORELASYON ANALİZİ SAYFASI */}
        {activePage === "korelasyon" && (
          <KorelasyonAnalizi
            loading={correlationLoading}
            correlationAnalysis={correlationAnalysis}
            selectedYear={correlationYear}
            selectedMonth={correlationMonth}
            selectedSeason={correlationSeason}
            selectedNeighborhood={correlationNeighborhood}
            neighborhoods={neighborhoods}
            onYearChange={setCorrelationYear}
            onMonthChange={setCorrelationMonth}
            onSeasonChange={setCorrelationSeason}
            onNeighborhoodChange={setCorrelationNeighborhood}
          />
        )}
      </div>
    </div>
  );
};

export default AnalitikModuller;


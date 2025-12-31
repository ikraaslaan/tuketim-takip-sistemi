import React, { useState, useEffect } from "react";
import api from "../../services/api";
import { FileText, TrendingUp, BarChart3, Download, Calendar, Loader2, Trash2 } from "lucide-react";

const AnalitikModuller = () => {
  const [activePage, setActivePage] = useState("belgeler");
  const [loading, setLoading] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [statisticalSummary, setStatisticalSummary] = useState(null);
  const [timeSeriesAnalysis, setTimeSeriesAnalysis] = useState(null);
  const [generatingReport, setGeneratingReport] = useState(false);
  // Smart Date Filter: Default to previous month (not current month)
  const today = new Date();
  const currentMonth = today.getMonth() + 1; // 1-12
  const currentYear = today.getFullYear();
  const previousMonth = currentMonth === 1 ? 12 : currentMonth - 1;
  const previousYear = currentMonth === 1 ? currentYear - 1 : currentYear;
  
  const [selectedMonth, setSelectedMonth] = useState(previousMonth);
  const [selectedYear, setSelectedYear] = useState(previousYear);
  
  // Auto-fix invalid month selection (when month becomes hidden)
  useEffect(() => {
    const today = new Date();
    const currentMonthNum = today.getMonth() + 1;
    const currentYearNum = today.getFullYear();
    
    // If selected year is current year and selected month is current or future month
    if (selectedYear === currentYearNum && selectedMonth >= currentMonthNum) {
      // Auto-select previous month
      const prevMonth = currentMonthNum === 1 ? 12 : currentMonthNum - 1;
      console.log(`🔄 Auto-fixing invalid month selection: ${selectedMonth} -> ${prevMonth}`);
      setSelectedMonth(prevMonth);
    }
  }, [selectedYear, selectedMonth]);
  
  // Filter states for report generation
  const [neighborhoods, setNeighborhoods] = useState([]);
  const [selectedNeighborhood, setSelectedNeighborhood] = useState(""); // Empty by default - must select a neighborhood
  const [selectedResource, setSelectedResource] = useState("all");
  const [reportProgress, setReportProgress] = useState("");
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  // Fetch neighborhoods list for filter dropdown
  useEffect(() => {
    const fetchNeighborhoods = async () => {
      try {
        const response = await api.get("/stats/dashboard");
        if (response.data && response.data.success) {
          const names = response.data.data.map(item => item.mahalle);
          setNeighborhoods(names);
          // Auto-select first neighborhood if none selected
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

  // Fetch documents
  useEffect(() => {
    if (activePage === "belgeler") {
      fetchDocuments();
    }
  }, [activePage]);

  // Fetch statistical summary
  useEffect(() => {
    if (activePage === "istatistik") {
      fetchStatisticalSummary();
    }
  }, [activePage, selectedMonth, selectedYear]);

  // Fetch time series analysis
  useEffect(() => {
    if (activePage === "zaman") {
      fetchTimeSeriesAnalysis();
    }
  }, [activePage, selectedYear]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const response = await api.get("/analytics/documents");
      if (response.data && response.data.success) {
        // Filter out documents with invalid URLs
        const validDocuments = (response.data.data || []).filter(doc => 
          doc.download_url && 
          doc.download_url.trim() !== '' && 
          doc.download_url !== 'null' &&
          doc.download_url !== 'undefined'
        );
        setDocuments(validDocuments);
      } else {
        setDocuments([]);
      }
    } catch (error) {
      console.error("Belgeler yüklenemedi:", error);
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStatisticalSummary = async () => {
    try {
      setLoading(true);
      const response = await api.get(
        `/analytics/statistical-summary?month=${selectedMonth}&year=${selectedYear}`,
        {
          timeout: 60000 // 60 seconds for large data operations
        }
      );
      if (response.data && response.data.success) {
        setStatisticalSummary(response.data.data || []);
      } else {
        console.error("İstatistik özeti başarısız:", response.data);
        setStatisticalSummary([]);
      }
    } catch (error) {
      console.error("İstatistik özeti yüklenemedi:", error);
      if (error.code === 'ECONNABORTED') {
        alert("İstek zaman aşımına uğradı. Lütfen tekrar deneyin.");
      } else {
        alert("Veri yüklenirken hata oluştu: " + (error.response?.data?.message || error.message));
      }
      setStatisticalSummary([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchTimeSeriesAnalysis = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/analytics/time-series?year=${selectedYear}`, {
        timeout: 60000 // 60 seconds for large data operations
      });
      if (response.data && response.data.success) {
        setTimeSeriesAnalysis(response.data.data || null);
      } else {
        console.error("Zaman serisi analizi başarısız:", response.data);
        setTimeSeriesAnalysis(null);
      }
    } catch (error) {
      console.error("Zaman serisi analizi yüklenemedi:", error);
      if (error.code === 'ECONNABORTED') {
        alert("İstek zaman aşımına uğradı. Lütfen tekrar deneyin.");
      } else {
        alert("Veri yüklenirken hata oluştu: " + (error.response?.data?.message || error.message));
      }
      setTimeSeriesAnalysis(null);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to trigger browser download
  const downloadPDF = (url, filename) => {
    try {
      const link = document.createElement('a');
      link.href = url;
      link.download = filename || 'rapor.pdf';
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("PDF indirme hatası:", error);
      // Fallback: open in new tab
      window.open(url, '_blank');
    }
  };

  const handleGenerateReport = async () => {
    // RELIABILITY: Prevent generation if no neighborhood selected
    if (!selectedNeighborhood || selectedNeighborhood === "" || selectedNeighborhood === "all") {
      alert("⚠️ Lütfen bir mahalle seçin! Rapor oluşturmak için mahalle seçimi zorunludur.");
      return;
    }

    try {
      setGeneratingReport(true);
      setReportProgress("Veri hazırlanıyor...");
      
      // Prepare filters for MongoDB query optimization
      // Note: mahalle is now always required (no "all" option)
      const payload = {
        month: selectedMonth,
        year: selectedYear,
        mahalle: selectedNeighborhood, // Always a specific neighborhood
        resource: selectedResource === "all" ? "all" : selectedResource // Send "all" explicitly
      };
      
      console.log('📤 Sending report generation request:', payload);

      setReportProgress("MongoDB'den veri çekiliyor (chunking ile optimize edildi)...");
      
      const response = await api.post("/analytics/generate-report", payload, {
        timeout: 120000 // 120 seconds (2 minutes) for chunked PDF generation
      });

      setReportProgress("PDF oluşturuluyor...");

      if (response.data && response.data.success) {
        const downloadUrl = response.data.data?.downloadUrl;
        
        // Validate the returned URL with comprehensive safety checks
        if (downloadUrl && 
            typeof downloadUrl === 'string' && 
            downloadUrl.trim() !== '' && 
            downloadUrl !== 'null' && 
            downloadUrl !== 'undefined' &&
            (downloadUrl.startsWith('http://') || downloadUrl.startsWith('https://'))) {
          try {
            // Try to construct URL to validate it
            new URL(downloadUrl);
            setReportProgress("✅ Rapor başarıyla oluşturuldu!");
            
            // AUTO-DOWNLOAD: Trigger browser download immediately
            const fileName = `rapor_${selectedYear}_${String(selectedMonth).padStart(2, '0')}_${selectedNeighborhood.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
            downloadPDF(downloadUrl, fileName);
            
            // UI UPDATE: Refresh documents list immediately after successful upload
            setReportProgress("📋 Liste güncelleniyor...");
            await fetchDocuments(); // Refresh documents list
            
            // SUCCESS TOAST: Show success notification
            setSuccessMessage("✅ Rapor başarıyla oluşturuldu, indiriliyor ve liste güncellendi!");
            setShowSuccessToast(true);
            
            // Auto-hide toast after 5 seconds
            setTimeout(() => {
              setShowSuccessToast(false);
            }, 5000);
            
            setReportProgress("✅ Rapor başarıyla oluşturuldu ve yüklendi!");
          } catch (urlError) {
            console.error("Geçersiz download URL:", downloadUrl, urlError);
            setReportProgress("⚠️ URL hatası");
            alert("⚠️ Rapor oluşturuldu ancak geçersiz indirme URL'si döndü. Lütfen belgeler listesini kontrol edin.");
            await fetchDocuments(); // Refresh documents list anyway
          }
        } else {
          setReportProgress("⚠️ URL alınamadı");
          alert("⚠️ Rapor oluşturuldu ancak indirme URL'si alınamadı. Lütfen belgeler listesini kontrol edin.");
          await fetchDocuments(); // Refresh documents list anyway
        }
      } else {
        const errorMsg = response.data?.message || "Bilinmeyen hata";
        setReportProgress("❌ Hata: " + errorMsg);
        alert("Rapor oluşturulamadı: " + errorMsg);
      }
    } catch (error) {
      console.error("Rapor oluşturma hatası:", error);
      setReportProgress("❌ Hata oluştu");
      
      if (error.code === 'ECONNABORTED') {
        alert("Rapor oluşturma işlemi zaman aşımına uğradı. Chunking ile optimize edilmiş işlem 2 dakika sürebilir. Lütfen tekrar deneyin.");
      } else if (error.response?.data?.message) {
        // Check if it's a Supabase configuration error
        if (error.response.data.message.includes('Supabase not configured')) {
          alert("Supabase yapılandırması eksik! Lütfen backend/.env dosyasında SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY değişkenlerini kontrol edin.");
        } else if (error.response.data.message.includes('Sort exceeded memory limit')) {
          alert("MongoDB bellek hatası! Lütfen daha spesifik filtreler seçin (ör: belirli bir mahalle).");
        } else {
          alert("Rapor oluşturulurken hata oluştu: " + error.response.data.message);
        }
      } else {
        alert("Rapor oluşturulurken hata oluştu: " + (error.message || "Bilinmeyen hata"));
      }
    } finally {
      setGeneratingReport(false);
      setReportProgress("");
    }
  };

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString("tr-TR", {
        year: "numeric",
        month: "long",
        day: "numeric"
      });
    } catch {
      return dateString;
    }
  };

  // Delete document handler
  const handleDeleteDocument = async (docId, docName) => {
    // Show confirmation alert
    const confirmed = window.confirm(
      `Bu raporu silmek istediğinize emin misiniz?\n\nRapor: ${docName}\n\nBu işlem geri alınamaz.`
    );

    if (!confirmed) {
      return;
    }

    try {
      // Call DELETE API
      const response = await api.delete(`/analytics/documents/${docId}`);

      if (response.data && response.data.success) {
        // Remove item from documents state immediately (no refresh needed)
        setDocuments(prevDocuments => prevDocuments.filter(doc => doc.id !== docId));
        
        // Show success message
        setSuccessMessage("✅ Rapor başarıyla silindi!");
        setShowSuccessToast(true);
        setTimeout(() => {
          setShowSuccessToast(false);
        }, 3000);
      } else {
        alert("Rapor silinirken hata oluştu: " + (response.data?.message || "Bilinmeyen hata"));
      }
    } catch (error) {
      console.error("Rapor silme hatası:", error);
      alert("Rapor silinirken hata oluştu: " + (error.response?.data?.message || error.message || "Bilinmeyen hata"));
    }
  };

  return (
    <div className="pt-24 px-8 min-h-screen bg-[#DDEEE3]">
      {/* SUCCESS TOAST NOTIFICATION */}
      {showSuccessToast && (
        <div className="fixed top-20 right-8 z-50 animate-slide-in">
          <div className="bg-emerald-600 text-white px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 min-w-[300px]">
            <div className="flex-1">
              <p className="font-semibold">{successMessage}</p>
            </div>
            <button
              onClick={() => setShowSuccessToast(false)}
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
              
              {/* FILTER HEADER - Clean UI for Report Generation */}
              <div className="bg-emerald-50 rounded-lg p-4 mb-4 border border-emerald-200">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Rapor Filtreleri</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  {/* Neighborhood Filter */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Mahalle</label>
                    <select
                      value={selectedNeighborhood}
                      onChange={(e) => setSelectedNeighborhood(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      disabled={neighborhoods.length === 0 || generatingReport}
                      required
                    >
                      <option value="">-- Mahalle Seçin (Zorunlu) --</option>
                      {neighborhoods.map((neighborhood) => (
                        <option key={neighborhood} value={neighborhood}>
                          {neighborhood}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Resource Filter */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Kaynak</label>
                    <select
                      value={selectedResource}
                      onChange={(e) => setSelectedResource(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      disabled={generatingReport}
                    >
                      <option value="all">Tüm Kaynaklar</option>
                      <option value="elektrik">Elektrik</option>
                      <option value="su">Su</option>
                      <option value="dogalgaz">Doğalgaz</option>
                    </select>
                  </div>

                  {/* Period Filter - Month */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Ay</label>
                    <select
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      disabled={generatingReport}
                    >
                      {(() => {
                        // Dynamic Month Filter: Hide current month and future months
                        const today = new Date();
                        const currentMonthNum = today.getMonth() + 1; // 1-12
                        const currentYearNum = today.getFullYear();
                        
                        // If selected year is current year: only show months less than current month
                        // If selected year is past: show all 12 months
                        const maxMonth = selectedYear === currentYearNum 
                          ? currentMonthNum - 1  // Hide current month and future
                          : 12; // Show all months for past years
                        
                        return Array.from({ length: maxMonth }, (_, i) => i + 1).map((m) => (
                          <option key={m} value={m}>
                            {m}. Ay
                          </option>
                        ));
                      })()}
                    </select>
                  </div>

                  {/* Period Filter - Year */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Yıl</label>
                    <select
                      value={selectedYear}
                      onChange={(e) => {
                        const newYear = parseInt(e.target.value);
                        setSelectedYear(newYear);
                        
                        // Validate month when year changes
                        const today = new Date();
                        const currentMonthNum = today.getMonth() + 1;
                        const currentYearNum = today.getFullYear();
                        
                        // If new year is current year and selected month is >= current month, reset to previous month
                        if (newYear === currentYearNum && selectedMonth >= currentMonthNum) {
                          const prevMonth = currentMonthNum === 1 ? 12 : currentMonthNum - 1;
                          setSelectedMonth(prevMonth);
                        }
                      }}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      disabled={generatingReport}
                    >
                      {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Generate Button with Progress Indicator */}
                <div className="mt-4 flex items-center justify-between">
                  <button
                    onClick={handleGenerateReport}
                    disabled={generatingReport || !selectedNeighborhood || selectedNeighborhood === ""}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg font-semibold transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {generatingReport ? (
                      <>
                        <Loader2 className="animate-spin" size={18} />
                        İşleniyor...
                      </>
                    ) : (
                      <>
                        <Calendar size={18} />
                        Rapor Oluştur
                      </>
                    )}
                  </button>
                  
                  {reportProgress && (
                    <div className="text-sm text-emerald-700 font-medium">
                      {reportProgress}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-10">
                <Loader2 className="animate-spin mx-auto mb-4 text-emerald-600" size={32} />
                <p className="text-gray-600">Belgeler yükleniyor...</p>
              </div>
            ) : documents.length === 0 ? (
              <div className="text-center py-10 text-gray-500">
                <FileText size={48} className="mx-auto mb-4 opacity-50" />
                <p>Henüz belge bulunmuyor.</p>
                <p className="text-sm mt-2">Yukarıdaki butona tıklayarak yeni rapor oluşturabilirsiniz.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {documents.map((doc, index) => (
                  <div
                    key={index}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-gray-800">{doc.neighborhood_name}</h3>
                          {/* Resource Type Badge */}
                          {(() => {
                            const resourceType = doc.resource || doc.resourceType || 'all';
                            if (resourceType === 'elektrik') {
                              return (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold bg-yellow-100 text-yellow-800">
                                  ⚡ Elektrik
                                </span>
                              );
                            } else if (resourceType === 'su') {
                              return (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold bg-blue-100 text-blue-800">
                                  💧 Su
                                </span>
                              );
                            } else if (resourceType === 'dogalgaz') {
                              return (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold bg-orange-100 text-orange-800">
                                  🔥 Doğalgaz
                                </span>
                              );
                            } else {
                              return (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold bg-gray-100 text-gray-800">
                                  📋 Tüm Kaynaklar
                                </span>
                              );
                            }
                          })()}
                        </div>
                        <p className="text-sm text-gray-500">
                          {doc.month}/{doc.year}
                        </p>
                      </div>
                      <FileText className="text-emerald-600" size={24} />
                    </div>
                    <p className="text-xs text-gray-400 mb-3">
                      {formatDate(doc.report_date || doc.created_at)}
                    </p>
                    <div className="flex items-center gap-2">
                      {(() => {
                        // Validate URL before using it
                        const isValidUrl = doc.download_url && 
                          doc.download_url.trim() !== '' && 
                          doc.download_url !== 'null' &&
                          doc.download_url !== 'undefined' &&
                          (doc.download_url.startsWith('http://') || doc.download_url.startsWith('https://'));
                        
                        if (isValidUrl) {
                          try {
                            // Try to construct URL to validate it
                            new URL(doc.download_url);
                            return (
                              <a
                                href={doc.download_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 px-4 py-2 rounded-lg text-sm font-medium transition"
                                onClick={(e) => {
                                  // Ensure it opens in new tab and triggers download
                                  e.preventDefault();
                                  window.open(doc.download_url, '_blank');
                                }}
                              >
                                <Download size={16} />
                                İndir
                              </a>
                            );
                          } catch (urlError) {
                            console.error('Invalid URL:', doc.download_url, urlError);
                            return (
                              <span className="inline-flex items-center gap-2 bg-gray-100 text-gray-500 px-4 py-2 rounded-lg text-sm font-medium cursor-not-allowed">
                                <Download size={16} />
                                Geçersiz URL
                              </span>
                            );
                          }
                        } else {
                          return (
                            <span className="inline-flex items-center gap-2 bg-gray-100 text-gray-500 px-4 py-2 rounded-lg text-sm font-medium cursor-not-allowed">
                              <Download size={16} />
                              URL Yok
                            </span>
                          );
                        }
                      })()}
                      
                      {/* Delete Button */}
                      <button
                        onClick={() => handleDeleteDocument(doc.id, `${doc.neighborhood_name} - ${doc.month}/${doc.year}`)}
                        className="inline-flex items-center gap-2 bg-red-100 hover:bg-red-200 text-red-700 px-4 py-2 rounded-lg text-sm font-medium transition"
                        title="Raporu Sil"
                      >
                        <Trash2 size={16} />
                        Sil
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* İSTATİSTİK ÖZETİ SAYFASI */}
        {activePage === "istatistik" && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                <TrendingUp className="text-emerald-600" />
                İstatistik Özeti
              </h2>
              <div className="flex gap-2">
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>
                      {m}. Ay
                    </option>
                  ))}
                </select>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-10">
                <Loader2 className="animate-spin mx-auto mb-4 text-emerald-600" size={32} />
                <p className="text-gray-600">Veriler yükleniyor...</p>
              </div>
            ) : !statisticalSummary || statisticalSummary.length === 0 ? (
              <div className="text-center py-10 text-gray-500">
                <p>Bu dönem için veri bulunamadı.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-emerald-50 text-gray-700">
                      <th className="p-4 font-semibold border-b">Mahalle</th>
                      <th className="p-4 font-semibold border-b">Elektrik (Ort/Zirve/Düşük)</th>
                      <th className="p-4 font-semibold border-b">Su (Ort/Zirve/Düşük)</th>
                      <th className="p-4 font-semibold border-b">Doğalgaz (Ort/Zirve/Düşük)</th>
                      <th className="p-4 font-semibold border-b">Değişim</th>
                    </tr>
                  </thead>
                  <tbody>
                    {statisticalSummary.map((item, index) => (
                      <tr key={index} className="border-b hover:bg-gray-50">
                        <td className="p-4 font-medium">{item.mahalle}</td>
                        <td className="p-4 text-sm">
                          {item.elektrik ? (
                            <>
                              {item.elektrik.average.toFixed(2)} / {item.elektrik.peak.toFixed(2)} /{" "}
                              {item.elektrik.lowest.toFixed(2)} kWh
                            </>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="p-4 text-sm">
                          {item.su ? (
                            <>
                              {item.su.average.toFixed(2)} / {item.su.peak.toFixed(2)} /{" "}
                              {item.su.lowest.toFixed(2)} m³
                            </>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="p-4 text-sm">
                          {item.dogalgaz ? (
                            <>
                              {item.dogalgaz.average.toFixed(2)} / {item.dogalgaz.peak.toFixed(2)} /{" "}
                              {item.dogalgaz.lowest.toFixed(2)} m³
                            </>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="p-4 text-sm">
                          {item.elektrik?.change && (
                            <span
                              className={`px-2 py-1 rounded ${
                                item.elektrik.change.increased
                                  ? "bg-red-100 text-red-700"
                                  : "bg-green-100 text-green-700"
                              }`}
                            >
                              E: {item.elektrik.change.percentage}%
                            </span>
                          )}
                          {item.su?.change && (
                            <span
                              className={`px-2 py-1 rounded ml-1 ${
                                item.su.change.increased
                                  ? "bg-red-100 text-red-700"
                                  : "bg-green-100 text-green-700"
                              }`}
                            >
                              S: {item.su.change.percentage}%
                            </span>
                          )}
                          {item.dogalgaz?.change && (
                            <span
                              className={`px-2 py-1 rounded ml-1 ${
                                item.dogalgaz.change.increased
                                  ? "bg-red-100 text-red-700"
                                  : "bg-green-100 text-green-700"
                              }`}
                            >
                              D: {item.dogalgaz.change.percentage}%
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ZAMAN SERİSİ ANALİZİ SAYFASI */}
        {activePage === "zaman" && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                <BarChart3 className="text-emerald-600" />
                Zaman Serisi Analizi
              </h2>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            {loading ? (
              <div className="text-center py-10">
                <Loader2 className="animate-spin mx-auto mb-4 text-emerald-600" size={32} />
                <p className="text-gray-600">Veriler yükleniyor...</p>
              </div>
            ) : !timeSeriesAnalysis ? (
              <div className="text-center py-10 text-gray-500">
                <p>Bu dönem için veri bulunamadı.</p>
              </div>
            ) : (
              <div className="space-y-8">
                {/* Mevsimsel Tüketim */}
                <div>
                  <h3 className="text-xl font-bold text-gray-800 mb-4">Mevsimsel Tüketim</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {Object.values(timeSeriesAnalysis.seasonalConsumption || {}).map(
                      (season, index) => (
                        <div
                          key={index}
                          className="border border-gray-200 rounded-lg p-4 bg-emerald-50"
                        >
                          <h4 className="font-semibold text-gray-800 mb-3">{season.name}</h4>
                          <div className="space-y-2 text-sm">
                            <p>
                              <span className="font-medium">Elektrik:</span>{" "}
                              {season.elektrik.average.toFixed(2)} kWh
                            </p>
                            <p>
                              <span className="font-medium">Su:</span> {season.su.average.toFixed(2)} m³
                            </p>
                            <p>
                              <span className="font-medium">Doğalgaz:</span>{" "}
                              {season.dogalgaz.average.toFixed(2)} m³
                            </p>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>

                {/* Mevsimsel Arızalar */}
                <div>
                  <h3 className="text-xl font-bold text-gray-800 mb-4">Mevsimsel Arıza Frekansı</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {Object.values(timeSeriesAnalysis.seasonalIncidents || {}).map(
                      (season, index) => (
                        <div
                          key={index}
                          className="border border-gray-200 rounded-lg p-4 bg-red-50"
                        >
                          <h4 className="font-semibold text-gray-800 mb-3">{season.name}</h4>
                          <p className="text-lg font-bold text-red-600 mb-2">
                            Toplam: {season.count} arıza
                          </p>
                          <div className="space-y-1 text-sm">
                            <p>Elektrik: {season.byResource.Elektrik}</p>
                            <p>Su: {season.byResource.Su}</p>
                            <p>Doğalgaz: {season.byResource.Dogalgaz}</p>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>

                {/* Korelasyon Analizi */}
                {timeSeriesAnalysis.correlations && timeSeriesAnalysis.correlations.length > 0 && (
                  <div>
                    <h3 className="text-xl font-bold text-gray-800 mb-4">Korelasyon Analizi</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {timeSeriesAnalysis.correlations.map((corr, index) => (
                        <div
                          key={index}
                          className="border border-gray-200 rounded-lg p-4 bg-blue-50"
                        >
                          <h4 className="font-semibold text-gray-800 mb-3 uppercase">
                            {corr.resource}
                          </h4>
                          <div className="space-y-2 text-sm">
                            <p>
                              <span className="font-medium">Zirve Mevsim:</span> {corr.peakSeason} (
                              {corr.peakValue.toFixed(2)})
                            </p>
                            <p>
                              <span className="font-medium">En Düşük Mevsim:</span> {corr.lowestSeason} (
                              {corr.lowestValue.toFixed(2)})
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalitikModuller;

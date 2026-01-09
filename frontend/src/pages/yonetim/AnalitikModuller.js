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
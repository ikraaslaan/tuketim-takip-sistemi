import { useState } from 'react';
import api from '../../../services/api';
import { downloadPDF } from '../utils/helpers';

export const useReportGeneration = (fetchDocuments) => {
  const [generatingReport, setGeneratingReport] = useState(false);
  const [reportProgress, setReportProgress] = useState("");
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const generateReport = async (selectedNeighborhood, selectedResource, selectedMonth, selectedYear) => {
    if (!selectedNeighborhood) {
      alert("⚠️ Lütfen bir mahalle seçin!");
      return;
    }

    try {
      setGeneratingReport(true);
      setReportProgress("Hazırlanıyor...");

      const payload = {
        month: selectedMonth,
        year: selectedYear,
        mahalle: selectedNeighborhood,
        resource: selectedResource === "all" ? "all" : selectedResource
      };

      setReportProgress("MongoDB'den veri çekiliyor (chunking ile optimize edildi)...");
      
      const response = await api.post("/analytics/generate-report", payload, {
        timeout: 120000
      });

      setReportProgress("PDF oluşturuluyor...");

      if (response.data && response.data.success) {
        const downloadUrl = response.data.data?.downloadUrl;
        
        if (downloadUrl && 
            typeof downloadUrl === 'string' && 
            downloadUrl.trim() !== '' && 
            downloadUrl !== 'null' && 
            downloadUrl !== 'undefined' &&
            (downloadUrl.startsWith('http://') || downloadUrl.startsWith('https://'))) {
          try {
            new URL(downloadUrl);
            setReportProgress("✅ Rapor başarıyla oluşturuldu!");
            
            const fileName = `rapor_${selectedYear}_${String(selectedMonth).padStart(2, '0')}_${selectedNeighborhood.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
            downloadPDF(downloadUrl, fileName);
            
            setReportProgress("📋 Supabase'e kaydediliyor...");
            // Supabase'in dosyayı işlemesi için kısa bir bekleme
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            setReportProgress("📋 Liste güncelleniyor...");
            // Belgeler listesini yenile
            await fetchDocuments();
            
            // Bir kez daha kontrol et (Supabase bazen gecikebilir)
            setTimeout(async () => {
              await fetchDocuments();
            }, 3000);
            
            setSuccessMessage("✅ Rapor başarıyla oluşturuldu, Supabase'e kaydedildi ve liste güncellendi!");
            setShowSuccessToast(true);
            
            setTimeout(() => {
              setShowSuccessToast(false);
            }, 5000);
            
            setReportProgress("✅ Rapor başarıyla oluşturuldu ve yüklendi!");
          } catch (urlError) {
            console.error("Geçersiz download URL:", downloadUrl, urlError);
            setReportProgress("⚠️ URL hatası");
            alert("⚠️ Rapor oluşturuldu ancak geçersiz indirme URL'si döndü. Lütfen belgeler listesini kontrol edin.");
            await new Promise(resolve => setTimeout(resolve, 2000));
            await fetchDocuments();
            setTimeout(async () => {
              await fetchDocuments();
            }, 3000);
          }
        } else {
          setReportProgress("⚠️ URL alınamadı");
          alert("⚠️ Rapor oluşturuldu ancak indirme URL'si alınamadı. Lütfen belgeler listesini kontrol edin.");
          await new Promise(resolve => setTimeout(resolve, 2000));
          await fetchDocuments();
          setTimeout(async () => {
            await fetchDocuments();
          }, 3000);
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

  return {
    generatingReport,
    reportProgress,
    showSuccessToast,
    successMessage,
    setShowSuccessToast,
    generateReport
  };
};

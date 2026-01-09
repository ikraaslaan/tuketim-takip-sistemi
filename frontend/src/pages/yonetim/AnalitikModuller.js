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
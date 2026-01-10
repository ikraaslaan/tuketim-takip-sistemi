import { useState, useEffect } from 'react';
import api from '../../../services/api';

export const useTimeSeriesAnalysis = (activePage, selectedYear) => {
  const [timeSeriesAnalysis, setTimeSeriesAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchTimeSeriesAnalysis = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/analytics/time-series?year=${selectedYear}`, {
        timeout: 60000
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

  useEffect(() => {
    if (activePage === "zaman") {
      fetchTimeSeriesAnalysis();
    }
  }, [activePage, selectedYear]);

  return { timeSeriesAnalysis, loading, fetchTimeSeriesAnalysis };
};

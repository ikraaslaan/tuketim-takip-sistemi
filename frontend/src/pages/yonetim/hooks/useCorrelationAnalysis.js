import { useState, useEffect } from 'react';
import api from '../../../services/api';

export const useCorrelationAnalysis = (activePage, selectedYear, selectedMonth, selectedSeason, selectedNeighborhood) => {
  const [correlationAnalysis, setCorrelationAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchCorrelationAnalysis = async () => {
    try {
      setLoading(true);
      let url = `/analytics/correlation?year=${selectedYear}`;
      if (selectedSeason) {
        url += `&season=${selectedSeason}`;
      } else if (selectedMonth) {
        url += `&month=${selectedMonth}`;
      }
      if (selectedNeighborhood) {
        url += `&mahalle=${encodeURIComponent(selectedNeighborhood)}`;
      }
      
      const response = await api.get(url, {
        timeout: 60000
      });
      if (response.data && response.data.success) {
        setCorrelationAnalysis(response.data.data || null);
      } else {
        console.error("Korelasyon analizi başarısız:", response.data);
        setCorrelationAnalysis(null);
      }
    } catch (error) {
      console.error("Korelasyon analizi yüklenemedi:", error);
      if (error.code === 'ECONNABORTED') {
        alert("İstek zaman aşımına uğradı. Lütfen tekrar deneyin.");
      } else {
        alert("Veri yüklenirken hata oluştu: " + (error.response?.data?.message || error.message));
      }
      setCorrelationAnalysis(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activePage === "korelasyon") {
      fetchCorrelationAnalysis();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePage, selectedYear, selectedMonth, selectedSeason, selectedNeighborhood]);

  return { correlationAnalysis, loading, fetchCorrelationAnalysis };
};

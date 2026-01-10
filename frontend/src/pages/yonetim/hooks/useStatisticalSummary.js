import { useState, useEffect } from 'react';
import api from '../../../services/api';

export const useStatisticalSummary = (activePage, selectedMonth, selectedYear) => {
  const [statisticalSummary, setStatisticalSummary] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchStatisticalSummary = async () => {
    try {
      setLoading(true);
      const response = await api.get(
        `/analytics/statistical-summary?month=${selectedMonth}&year=${selectedYear}`,
        {
          timeout: 60000
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

  useEffect(() => {
    if (activePage === "istatistik") {
      fetchStatisticalSummary();
    }
  }, [activePage, selectedMonth, selectedYear]);

  return { statisticalSummary, loading, fetchStatisticalSummary };
};

import { useState, useEffect } from 'react';
import api from '../../../services/api';

export const useDocuments = (activePage) => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const response = await api.get("/analytics/documents");
      console.log("📋 Belgeler çekiliyor...", response.data);
      if (response.data && response.data.success) {
        const validDocuments = (response.data.data || []).filter(doc => 
          doc.download_url && 
          doc.download_url.trim() !== '' && 
          doc.download_url !== 'null' &&
          doc.download_url !== 'undefined'
        );
        console.log("✅ Geçerli belgeler:", validDocuments.length);
        setDocuments(validDocuments);
      } else {
        console.log("⚠️ Belgeler başarısız:", response.data);
        setDocuments([]);
      }
    } catch (error) {
      console.error("Belgeler yüklenemedi:", error);
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activePage === "belgeler") {
      fetchDocuments();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePage]);

  return { documents, loading, fetchDocuments };
};

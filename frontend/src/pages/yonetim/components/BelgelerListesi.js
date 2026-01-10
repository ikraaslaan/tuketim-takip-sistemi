import React from 'react';
import { FileText, Download, Trash2, Loader2 } from 'lucide-react';
import { formatDate } from '../utils/helpers';
import api from '../../../services/api';

const BelgelerListesi = ({ documents, loading, onDelete, onRefresh }) => {
  const handleDeleteDocument = async (doc, docName) => {
    const confirmed = window.confirm(
      `Bu raporu silmek istediğinize emin misiniz?\n\nRapor: ${docName}\n\nBu işlem geri alınamaz ve Supabase'den de silinecektir.`
    );

    if (!confirmed) return;

    try {
      // Dosya adını kullan (backend'de id olarak dosya adı gönderiliyor)
      const fileId = doc.name || doc.id || doc.download_url?.split('/').pop()?.split('?')[0];
      console.log('🗑️ Silinecek belge:', fileId, doc);
      
      const response = await api.delete(`/analytics/documents/${encodeURIComponent(fileId)}`);
      if (response.data && response.data.success) {
        // Liste güncelle
        if (onRefresh) {
          await onRefresh();
        }
        if (onDelete) {
          onDelete(doc.id || fileId);
        }
        alert("✅ Rapor başarıyla silindi!");
      } else {
        alert("Rapor silinirken hata oluştu: " + (response.data?.message || "Bilinmeyen hata"));
      }
    } catch (error) {
      console.error("Rapor silme hatası:", error);
      alert("Rapor silinirken hata oluştu: " + (error.response?.data?.message || error.message || "Bilinmeyen hata"));
    }
  };

  const getResourceBadge = (resourceType) => {
    const resource = resourceType || 'all';
    if (resource === 'elektrik') {
      return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold bg-yellow-100 text-yellow-800">⚡ Elektrik</span>;
    } else if (resource === 'su') {
      return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold bg-blue-100 text-blue-800">💧 Su</span>;
    } else if (resource === 'dogalgaz') {
      return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold bg-orange-100 text-orange-800">🔥 Doğalgaz</span>;
    } else {
      return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold bg-gray-100 text-gray-800">📋 Tüm Kaynaklar</span>;
    }
  };

  const handleDownload = (doc) => {
    const isValidUrl = doc.download_url && 
      doc.download_url.trim() !== '' && 
      doc.download_url !== 'null' &&
      doc.download_url !== 'undefined' &&
      (doc.download_url.startsWith('http://') || doc.download_url.startsWith('https://'));
    
    if (isValidUrl) {
      try {
        // PDF'i yeni sekmede aç
        const link = document.createElement('a');
        link.href = doc.download_url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (urlError) {
        console.error('Invalid URL:', doc.download_url, urlError);
        alert('PDF açılamadı. Lütfen URL\'yi kontrol edin.');
      }
    } else {
      alert('PDF URL\'si geçersiz.');
    }
  };

  const renderDownloadButton = (doc) => {
    const isValidUrl = doc.download_url && 
      doc.download_url.trim() !== '' && 
      doc.download_url !== 'null' &&
      doc.download_url !== 'undefined' &&
      (doc.download_url.startsWith('http://') || doc.download_url.startsWith('https://'));
    
    if (isValidUrl) {
      try {
        new URL(doc.download_url);
        return (
          <button
            onClick={() => handleDownload(doc)}
            className="inline-flex items-center gap-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 px-4 py-2 rounded-lg text-sm font-medium transition"
          >
            <Download size={16} />
            İndir
          </button>
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
  };

  if (loading) {
    return (
      <div className="text-center py-10">
        <Loader2 className="animate-spin mx-auto mb-4 text-emerald-600" size={32} />
        <p className="text-gray-600">Belgeler yükleniyor...</p>
      </div>
    );
  }

  if (!documents || documents.length === 0) {
    return (
      <div className="mt-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">Supabase'de Kayıtlı Belgeler</h3>
        <div className="text-center py-10 text-gray-500 bg-gray-50 rounded-lg border border-gray-200">
          <FileText size={48} className="mx-auto mb-4 opacity-50" />
          <p className="font-medium">Henüz belge bulunmuyor.</p>
          <p className="text-sm mt-2 text-gray-400">Yukarıdaki butona tıklayarak yeni rapor oluşturabilirsiniz.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <h3 className="text-lg font-semibold text-gray-700 mb-4">Supabase'de Kayıtlı Belgeler</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {documents.map((doc, index) => (
          <div
            key={doc.id || index}
            className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition bg-white"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h3 className="font-semibold text-gray-800">{doc.neighborhood_name || 'Bilinmeyen Mahalle'}</h3>
                  {getResourceBadge(doc.resource || doc.resourceType)}
                </div>
                <p className="text-sm text-gray-500">
                  {doc.month || 'N/A'}/{doc.year || 'N/A'}
                </p>
              </div>
              <FileText className="text-emerald-600 flex-shrink-0" size={24} />
            </div>
            <p className="text-xs text-gray-400 mb-3">
              {formatDate(doc.report_date || doc.created_at)}
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              {renderDownloadButton(doc)}
              <button
                onClick={() => handleDeleteDocument(doc, `${doc.neighborhood_name || 'Bilinmeyen'} - ${doc.month || 'N/A'}/${doc.year || 'N/A'}`)}
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
    </div>
  );
};

export default BelgelerListesi;

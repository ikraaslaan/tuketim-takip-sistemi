import React, { useState } from 'react';
import { FileText, Download, Trash2, Loader2, CheckSquare, Square } from 'lucide-react';
import { formatDate } from '../utils/helpers';
import api from '../../../services/api';

const BelgelerListesi = ({ documents, loading, onDelete, onRefresh }) => {
  const [selectedDocs, setSelectedDocs] = useState(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  // Checkbox yönetimi
  const toggleSelectDoc = (docId) => {
    const newSelected = new Set(selectedDocs);
    if (newSelected.has(docId)) {
      newSelected.delete(docId);
    } else {
      newSelected.add(docId);
    }
    setSelectedDocs(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedDocs.size === documents.length) {
      setSelectedDocs(new Set());
    } else {
      setSelectedDocs(new Set(documents.map(doc => doc.id || doc.name)));
    }
  };

  // Tek belge silme
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
        // Seçimden kaldır
        const newSelected = new Set(selectedDocs);
        newSelected.delete(doc.id || doc.name);
        setSelectedDocs(newSelected);
        alert("✅ Rapor başarıyla silindi!");
      } else {
        alert("Rapor silinirken hata oluştu: " + (response.data?.message || "Bilinmeyen hata"));
      }
    } catch (error) {
      console.error("Rapor silme hatası:", error);
      alert("Rapor silinirken hata oluştu: " + (error.response?.data?.message || error.message || "Bilinmeyen hata"));
    }
  };

  // Toplu silme
  const handleBulkDelete = async () => {
    if (selectedDocs.size === 0) {
      alert("⚠️ Lütfen silmek istediğiniz belgeleri seçin!");
      return;
    }

    const confirmed = window.confirm(
      `${selectedDocs.size} belgeyi silmek istediğinize emin misiniz?\n\nBu işlem geri alınamaz ve Supabase'den de silinecektir.`
    );

    if (!confirmed) return;

    setIsDeleting(true);
    const selectedArray = Array.from(selectedDocs);
    let successCount = 0;
    let failCount = 0;

    try {
      for (const docId of selectedArray) {
        try {
          const doc = documents.find(d => (d.id || d.name) === docId);
          if (!doc) continue;

          const fileId = doc.name || doc.id || doc.download_url?.split('/').pop()?.split('?')[0];
          const response = await api.delete(`/analytics/documents/${encodeURIComponent(fileId)}`);
          
          if (response.data && response.data.success) {
            successCount++;
          } else {
            failCount++;
          }
        } catch (error) {
          console.error(`Belge silme hatası (${docId}):`, error);
          failCount++;
        }
      }

      // Liste güncelle
      if (onRefresh) {
        await onRefresh();
      }

      // Seçimleri temizle
      setSelectedDocs(new Set());

      if (failCount === 0) {
        alert(`✅ ${successCount} belge başarıyla silindi!`);
      } else {
        alert(`⚠️ ${successCount} belge silindi, ${failCount} belge silinemedi.`);
      }
    } catch (error) {
      console.error("Toplu silme hatası:", error);
      alert("Toplu silme sırasında hata oluştu: " + (error.message || "Bilinmeyen hata"));
    } finally {
      setIsDeleting(false);
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

  const allSelected = documents.length > 0 && selectedDocs.size === documents.length;
  const someSelected = selectedDocs.size > 0 && selectedDocs.size < documents.length;

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-700">Supabase'de Kayıtlı Belgeler</h3>
        <div className="flex items-center gap-3">
          {/* Tümünü Seç Checkbox */}
          {documents.length > 0 && (
            <button
              onClick={toggleSelectAll}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 transition"
            >
              {allSelected ? (
                <CheckSquare className="text-emerald-600" size={20} />
              ) : someSelected ? (
                <div className="w-5 h-5 border-2 border-emerald-600 rounded bg-emerald-100" />
              ) : (
                <Square className="text-gray-400" size={20} />
              )}
              <span className="font-medium">
                {allSelected ? 'Tümünü Kaldır' : 'Tümünü Seç'}
              </span>
            </button>
          )}
          
          {/* Toplu Silme Butonu */}
          {selectedDocs.size > 0 && (
            <button
              onClick={handleBulkDelete}
              disabled={isDeleting}
              className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="animate-spin" size={16} />
                  Siliniyor...
                </>
              ) : (
                <>
                  <Trash2 size={16} />
                  Seçili {selectedDocs.size} Belgeyi Sil
                </>
              )}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {documents.map((doc, index) => {
          const docId = doc.id || doc.name;
          const isSelected = selectedDocs.has(docId);
          
          return (
            <div
              key={docId || index}
              className={`border rounded-lg p-4 transition bg-white ${
                isSelected 
                  ? 'border-emerald-500 shadow-lg ring-2 ring-emerald-200' 
                  : 'border-gray-200 hover:shadow-md'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start gap-3 flex-1">
                  {/* Checkbox */}
                  <button
                    onClick={() => toggleSelectDoc(docId)}
                    className="mt-1 flex-shrink-0"
                    title={isSelected ? 'Seçimi Kaldır' : 'Seç'}
                  >
                    {isSelected ? (
                      <CheckSquare className="text-emerald-600" size={20} />
                    ) : (
                      <Square className="text-gray-400 hover:text-emerald-600" size={20} />
                    )}
                  </button>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-semibold text-gray-800">{doc.neighborhood_name || 'Bilinmeyen Mahalle'}</h3>
                      {getResourceBadge(doc.resource || doc.resourceType)}
                    </div>
                    <p className="text-sm text-gray-500">
                      {doc.month || 'N/A'}/{doc.year || 'N/A'}
                    </p>
                  </div>
                </div>
                <FileText className="text-emerald-600 flex-shrink-0" size={24} />
              </div>
              <p className="text-xs text-gray-400 mb-3 ml-8">
                {formatDate(doc.report_date || doc.created_at)}
              </p>
              <div className="flex items-center gap-2 flex-wrap ml-8">
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
          );
        })}
      </div>
    </div>
  );
};

export default BelgelerListesi;

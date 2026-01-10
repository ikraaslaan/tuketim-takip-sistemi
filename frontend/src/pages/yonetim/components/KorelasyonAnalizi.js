import React from 'react';
import { TrendingUp, Loader2 } from 'lucide-react';

const KorelasyonAnalizi = ({ 
  loading, 
  correlationAnalysis, 
  selectedYear, 
  selectedMonth,
  selectedSeason,
  selectedNeighborhood,
  neighborhoods,
  onYearChange,
  onMonthChange,
  onSeasonChange,
  onNeighborhoodChange
}) => {

  const getResourceColor = (resource) => {
    if (resource === 'Elektrik') return 'bg-amber-50 border-amber-200 text-amber-800';
    if (resource === 'Su') return 'bg-blue-50 border-blue-200 text-blue-800';
    if (resource === 'Doğalgaz') return 'bg-orange-50 border-orange-200 text-orange-800';
    return 'bg-gray-50 border-gray-200 text-gray-800';
  };

  const getResourceIconColor = (resource) => {
    if (resource === 'Elektrik') return 'text-amber-600';
    if (resource === 'Su') return 'text-blue-600';
    if (resource === 'Doğalgaz') return 'text-orange-600';
    return 'text-gray-600';
  };

  return (
    <div>
      {/* Ana Başlık - Korelasyon Analizi */}
      <div className="mb-6 pb-4 border-b border-gray-200">
        <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3 mb-3">
          <TrendingUp className="text-emerald-600" size={32} />
          Korelasyon Analizi
        </h1>
        <h2 className="text-xl font-semibold text-gray-600 ml-11">
          Zaman Bazlı Korelasyon (Mevsimsel)
        </h2>
      </div>

      {/* Filtreler */}
      <div className="bg-emerald-50 rounded-lg p-4 mb-6 border border-emerald-200">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Filtreler</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Mahalle Seçimi */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Mahalle</label>
            <select
              value={selectedNeighborhood || ''}
              onChange={(e) => onNeighborhoodChange(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">Tüm Mahalleler</option>
              {neighborhoods && neighborhoods.map((neighborhood) => (
                <option key={neighborhood} value={neighborhood}>
                  {neighborhood}
                </option>
              ))}
            </select>
          </div>

          {/* Yıl Seçimi */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Yıl</label>
            <select
              value={selectedYear}
              onChange={(e) => onYearChange(parseInt(e.target.value))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          {/* Mevsim Seçimi */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Mevsim</label>
            <select
              value={selectedSeason || ''}
              onChange={(e) => {
                onSeasonChange(e.target.value || null);
                // Mevsim seçildiğinde ay seçimini temizle
                if (e.target.value) {
                  onMonthChange(null);
                }
              }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">Tüm Mevsimler</option>
              <option value="kis">Kış (Aralık, Ocak, Şubat)</option>
              <option value="ilkbahar">İlkbahar (Mart, Nisan, Mayıs)</option>
              <option value="yaz">Yaz (Haziran, Temmuz, Ağustos)</option>
              <option value="sonbahar">Sonbahar (Eylül, Ekim, Kasım)</option>
            </select>
          </div>

          {/* Ay Seçimi */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Ay</label>
            <select
              value={selectedMonth || ''}
              onChange={(e) => {
                onMonthChange(e.target.value ? parseInt(e.target.value) : null);
                // Ay seçildiğinde mevsim seçimini temizle
                if (e.target.value) {
                  onSeasonChange(null);
                }
              }}
              disabled={!!selectedSeason}
              className={`w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                selectedSeason ? 'bg-gray-100 cursor-not-allowed' : ''
              }`}
            >
              <option value="">Tüm Aylar</option>
              {[
                { value: 1, label: 'Ocak' },
                { value: 2, label: 'Şubat' },
                { value: 3, label: 'Mart' },
                { value: 4, label: 'Nisan' },
                { value: 5, label: 'Mayıs' },
                { value: 6, label: 'Haziran' },
                { value: 7, label: 'Temmuz' },
                { value: 8, label: 'Ağustos' },
                { value: 9, label: 'Eylül' },
                { value: 10, label: 'Ekim' },
                { value: 11, label: 'Kasım' },
                { value: 12, label: 'Aralık' }
              ].map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="mb-4 text-sm text-gray-600">
        <p>
          Mevsimsel tüketim trendleri ve kaynaklar arası korelasyon analizi
          {selectedNeighborhood && ` - ${selectedNeighborhood}`}
          {selectedSeason && (
            <>
              {' - '}
              {selectedSeason === 'kis' && 'Kış (Aralık, Ocak, Şubat)'}
              {selectedSeason === 'ilkbahar' && 'İlkbahar (Mart, Nisan, Mayıs)'}
              {selectedSeason === 'yaz' && 'Yaz (Haziran, Temmuz, Ağustos)'}
              {selectedSeason === 'sonbahar' && 'Sonbahar (Eylül, Ekim, Kasım)'}
            </>
          )}
          {selectedMonth && !selectedSeason && ` - ${['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'][selectedMonth - 1]}`}
          {` (${correlationAnalysis?.year || selectedYear} yılı)`}
        </p>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-10">
          <Loader2 className="animate-spin mx-auto mb-4 text-emerald-600" size={32} />
          <p className="text-gray-600">Veriler yükleniyor...</p>
        </div>
      )}

      {/* No Data State */}
      {!loading && (!correlationAnalysis || !correlationAnalysis.correlations || correlationAnalysis.correlations.length === 0) && (
        <div className="text-center py-10 text-gray-500 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-lg font-medium mb-2">Bu dönem için korelasyon verisi bulunamadı.</p>
          <p className="text-sm">Lütfen farklı bir mahalle, yıl veya ay seçin.</p>
        </div>
      )}

      {/* Data Display */}
      {!loading && correlationAnalysis && correlationAnalysis.correlations && correlationAnalysis.correlations.length > 0 && (
      <div className="space-y-6">
        {correlationAnalysis.correlations.map((corr, index) => (
          <div
            key={index}
            className={`border-2 rounded-lg p-6 ${getResourceColor(corr.resource)}`}
          >
            <div className="flex items-center gap-3 mb-4">
              <TrendingUp className={`${getResourceIconColor(corr.resource)}`} size={24} />
              <h3 className="text-xl font-bold uppercase">{corr.resource}</h3>
              <span className="text-sm font-medium">({corr.unit})</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* Zirve Mevsim */}
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <h4 className="text-sm font-semibold text-gray-600 mb-2">Zirve Mevsim</h4>
                <p className="text-2xl font-bold text-emerald-600">{corr.peakSeason}</p>
                <p className="text-sm text-gray-500 mt-1">
                  Ortalama: {corr.peakValue.toFixed(2)} {corr.unit}
                </p>
              </div>

              {/* En Düşük Mevsim */}
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <h4 className="text-sm font-semibold text-gray-600 mb-2">En Düşük Mevsim</h4>
                <p className="text-2xl font-bold text-blue-600">{corr.lowestSeason}</p>
                <p className="text-sm text-gray-500 mt-1">
                  Ortalama: {corr.lowestValue.toFixed(2)} {corr.unit}
                </p>
              </div>
            </div>

            {/* Mevsimsel Ortalamalar Tablosu */}
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Mevsimsel Ortalamalar</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.keys(corr.seasonalAverages).map((season) => (
                  <div key={season} className="text-center">
                    <p className="text-xs font-medium text-gray-500 mb-1">{season}</p>
                    <p className="text-lg font-bold">
                      {corr.seasonalAverages[season].toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-400">{corr.unit}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
      )}
    </div>
  );
};

export default KorelasyonAnalizi;
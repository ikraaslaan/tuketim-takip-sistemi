import React from 'react';
import { Calendar, Loader2 } from 'lucide-react';

const RaporFormu = ({
  neighborhoods,
  selectedNeighborhood,
  setSelectedNeighborhood,
  selectedResource,
  setSelectedResource,
  selectedMonth,
  setSelectedMonth,
  selectedYear,
  setSelectedYear,
  generatingReport,
  reportProgress,
  onGenerate
}) => {
  const today = new Date();
  const currentMonthNum = today.getMonth() + 1;
  const currentYearNum = today.getFullYear();

  const maxMonth = selectedYear === currentYearNum 
    ? currentMonthNum - 1
    : 12;

  const handleYearChange = (newYear) => {
    setSelectedYear(newYear);
    if (newYear === currentYearNum && selectedMonth >= currentMonthNum) {
      const prevMonth = currentMonthNum === 1 ? 12 : currentMonthNum - 1;
      setSelectedMonth(prevMonth);
    }
  };

  return (
    <div className="bg-emerald-50 rounded-lg p-4 mb-4 border border-emerald-200">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Rapor Filtreleri</h3>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Mahalle</label>
          <select
            value={selectedNeighborhood}
            onChange={(e) => setSelectedNeighborhood(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            disabled={neighborhoods.length === 0 || generatingReport}
            required
          >
            <option value="">-- Mahalle Seçin (Zorunlu) --</option>
            {neighborhoods.map((neighborhood) => (
              <option key={neighborhood} value={neighborhood}>
                {neighborhood}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Kaynak</label>
          <select
            value={selectedResource}
            onChange={(e) => setSelectedResource(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            disabled={generatingReport}
          >
            <option value="all">Tüm Kaynaklar</option>
            <option value="elektrik">Elektrik</option>
            <option value="su">Su</option>
            <option value="dogalgaz">Doğalgaz</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Ay</label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            disabled={generatingReport}
          >
            {Array.from({ length: maxMonth }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                {m}. Ay
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Yıl</label>
          <select
            value={selectedYear}
            onChange={(e) => handleYearChange(parseInt(e.target.value))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            disabled={generatingReport}
          >
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <button
          onClick={onGenerate}
          disabled={generatingReport || !selectedNeighborhood || selectedNeighborhood === ""}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg font-semibold transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {generatingReport ? (
            <>
              <Loader2 className="animate-spin" size={18} />
              İşleniyor...
            </>
          ) : (
            <>
              <Calendar size={18} />
              Rapor Oluştur
            </>
          )}
        </button>
        
        {reportProgress && (
          <div className="text-sm text-emerald-700 font-medium">
            {reportProgress}
          </div>
        )}
      </div>
    </div>
  );
};

export default RaporFormu;
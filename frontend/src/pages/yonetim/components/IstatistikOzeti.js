import React from 'react';
import { TrendingUp, Loader2 } from 'lucide-react';

const IstatistikOzeti = ({ loading, statisticalSummary, selectedMonth, selectedYear, onMonthChange, onYearChange }) => {
  if (loading) {
    return (
      <div className="text-center py-10">
        <Loader2 className="animate-spin mx-auto mb-4 text-emerald-600" size={32} />
        <p className="text-gray-600">Veriler yükleniyor...</p>
      </div>
    );
  }

  if (!statisticalSummary || statisticalSummary.length === 0) {
    return (
      <div className="text-center py-10 text-gray-500">
        <p>Bu dönem için veri bulunamadı.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
          <TrendingUp className="text-emerald-600" />
          İstatistik Özeti
        </h2>
        <div className="flex gap-2">
          <select
            value={selectedMonth}
            onChange={(e) => onMonthChange(parseInt(e.target.value))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                {m}. Ay
              </option>
            ))}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => onYearChange(parseInt(e.target.value))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-emerald-50 text-gray-700">
              <th className="p-4 font-semibold border-b">Mahalle</th>
              <th className="p-4 font-semibold border-b">Elektrik (Ort/Zirve/Düşük)</th>
              <th className="p-4 font-semibold border-b">Su (Ort/Zirve/Düşük)</th>
              <th className="p-4 font-semibold border-b">Doğalgaz (Ort/Zirve/Düşük)</th>
              <th className="p-4 font-semibold border-b">Değişim</th>
            </tr>
          </thead>
          <tbody>
            {statisticalSummary.map((item, index) => (
              <tr key={index} className="border-b hover:bg-gray-50">
                <td className="p-4 font-medium">{item.mahalle}</td>
                <td className="p-4 text-sm">
                  {item.elektrik ? (
                    <>
                      {item.elektrik.average.toFixed(2)} / {item.elektrik.peak.toFixed(2)} /{" "}
                      {item.elektrik.lowest.toFixed(2)} kWh
                    </>
                  ) : (
                    "-"
                  )}
                </td>
                <td className="p-4 text-sm">
                  {item.su ? (
                    <>
                      {item.su.average.toFixed(2)} / {item.su.peak.toFixed(2)} /{" "}
                      {item.su.lowest.toFixed(2)} m³
                    </>
                  ) : (
                    "-"
                  )}
                </td>
                <td className="p-4 text-sm">
                  {item.dogalgaz ? (
                    <>
                      {item.dogalgaz.average.toFixed(2)} / {item.dogalgaz.peak.toFixed(2)} /{" "}
                      {item.dogalgaz.lowest.toFixed(2)} m³
                    </>
                  ) : (
                    "-"
                  )}
                </td>
                <td className="p-4 text-sm">
                  {item.elektrik?.change ? (
                    <span
                      className={`px-2 py-1 rounded ${
                        item.elektrik.change.increased
                          ? "bg-red-100 text-red-700"
                          : "bg-green-100 text-green-700"
                      }`}
                    >
                      E: {item.elektrik.change.percentage}
                    </span>
                  ) : (
                    <span className="text-gray-400 text-xs">E: -</span>
                  )}
                  {item.su?.change ? (
                    <span
                      className={`px-2 py-1 rounded ml-1 ${
                        item.su.change.increased
                          ? "bg-red-100 text-red-700"
                          : "bg-green-100 text-green-700"
                      }`}
                    >
                      S: {item.su.change.percentage}
                    </span>
                  ) : (
                    <span className="text-gray-400 text-xs ml-1">S: -</span>
                  )}
                  {item.dogalgaz?.change ? (
                    <span
                      className={`px-2 py-1 rounded ml-1 ${
                        item.dogalgaz.change.increased
                          ? "bg-red-100 text-red-700"
                          : "bg-green-100 text-green-700"
                      }`}
                    >
                      D: {item.dogalgaz.change.percentage}
                    </span>
                  ) : (
                    <span className="text-gray-400 text-xs ml-1">D: -</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default IstatistikOzeti;

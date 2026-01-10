import React from 'react';
import { BarChart3, Loader2 } from 'lucide-react';

const ZamanSerisiAnalizi = ({ loading, timeSeriesAnalysis, selectedYear, onYearChange }) => {
  if (loading) {
    return (
      <div className="text-center py-10">
        <Loader2 className="animate-spin mx-auto mb-4 text-emerald-600" size={32} />
        <p className="text-gray-600">Veriler yükleniyor...</p>
      </div>
    );
  }

  if (!timeSeriesAnalysis) {
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
          <BarChart3 className="text-emerald-600" />
          Zaman Serisi Analizi
        </h2>
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

      <div className="space-y-8">
        {/* Mevsimsel Tüketim */}
        <div>
          <h3 className="text-xl font-bold text-gray-800 mb-4">Mevsimsel Tüketim</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.values(timeSeriesAnalysis.seasonalConsumption || {}).map(
              (season, index) => (
                <div
                  key={index}
                  className="border border-gray-200 rounded-lg p-4 bg-emerald-50"
                >
                  <h4 className="font-semibold text-gray-800 mb-3">{season.name}</h4>
                  <div className="space-y-2 text-sm">
                    <p>
                      <span className="font-medium">Elektrik:</span>{" "}
                      {season.elektrik.average.toFixed(2)} kWh
                    </p>
                    <p>
                      <span className="font-medium">Su:</span> {season.su.average.toFixed(2)} m³
                    </p>
                    <p>
                      <span className="font-medium">Doğalgaz:</span>{" "}
                      {season.dogalgaz.average.toFixed(2)} m³
                    </p>
                  </div>
                </div>
              )
            )}
          </div>
        </div>

        {/* Mevsimsel Arızalar */}
        <div>
          <h3 className="text-xl font-bold text-gray-800 mb-4">Mevsimsel Arıza Frekansı</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.values(timeSeriesAnalysis.seasonalIncidents || {}).map(
              (season, index) => (
                <div
                  key={index}
                  className="border border-gray-200 rounded-lg p-4 bg-red-50"
                >
                  <h4 className="font-semibold text-gray-800 mb-3">{season.name}</h4>
                  <p className="text-lg font-bold text-red-600 mb-2">
                    Toplam: {season.count} arıza
                  </p>
                  <div className="space-y-1 text-sm">
                    <p>Elektrik: {season.byResource.Elektrik}</p>
                    <p>Su: {season.byResource.Su}</p>
                    <p>Doğalgaz: {season.byResource.Dogalgaz}</p>
                  </div>
                </div>
              )
            )}
          </div>
        </div>

        {/* Korelasyon Analizi */}
        {timeSeriesAnalysis.correlations && timeSeriesAnalysis.correlations.length > 0 && (
          <div>
            <h3 className="text-xl font-bold text-gray-800 mb-4">Korelasyon Analizi</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {timeSeriesAnalysis.correlations.map((corr, index) => (
                <div
                  key={index}
                  className="border border-gray-200 rounded-lg p-4 bg-blue-50"
                >
                  <h4 className="font-semibold text-gray-800 mb-3 uppercase">
                    {corr.resource}
                  </h4>
                  <div className="space-y-2 text-sm">
                    <p>
                      <span className="font-medium">Zirve Mevsim:</span> {corr.peakSeason} (
                      {corr.peakValue.toFixed(2)})
                    </p>
                    <p>
                      <span className="font-medium">En Düşük Mevsim:</span> {corr.lowestSeason} (
                      {corr.lowestValue.toFixed(2)})
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ZamanSerisiAnalizi;

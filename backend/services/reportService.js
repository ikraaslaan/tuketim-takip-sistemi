const PDFDocument = require('pdfkit');
const supabase = require('../config/supabase');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs'); // Dosya kontrolü için gerekli

exports.generateAndUploadReport = async (data, reportName, options = {}) => {
    return new Promise((resolve, reject) => {
        try {
            // 1. Font dosyasının yolunu kontrol et
            const fontPath = path.join(__dirname, '../assets/fonts/Arial.ttf');
            
            if (!fs.existsSync(fontPath)) {
                console.error("❌ HATA: Font dosyası bulunamadı ->", fontPath);
                return reject(new Error("Font dosyasi bulunamadi. Lutfen assets/fonts/Arial.ttf dosyasini ekleyin."));
            }

            // Full width layout için margin'i minimize et
            const doc = new PDFDocument({ 
                margin: 30, // Daha küçük margin
                size: 'A4',
                layout: 'landscape' // Yatay layout daha geniş alan sağlar
            });
            let buffers = [];

            // 2. Fontu Kaydet
            doc.registerFont('TurkishFont', fontPath);
            doc.font('TurkishFont');

            doc.on('data', buffers.push.bind(buffers));
            
            // PDFKit içi hata yakalama
            doc.on('error', (err) => {
                console.error("❌ PDFKit Hatası:", err);
                reject(err);
            });

            doc.on('end', async () => {
                try {
                    console.log("📤 PDF oluşturuldu, Supabase'e yükleniyor...");
                    const pdfData = Buffer.concat(buffers);
                    console.log(`📊 PDF boyutu: ${(pdfData.length / 1024).toFixed(2)} KB`);
                    
                    // Supabase yapılandırmasını kontrol et
                    if (!supabase) {
                        const errorMsg = "Supabase client yapılandırılmamış!";
                        console.error("❌", errorMsg);
                        return reject(new Error(errorMsg));
                    }
                    
                    // Bucket'ın varlığını kontrol et
                    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
                    if (bucketError) {
                        console.error("❌ Supabase bucket listesi alınamadı:", bucketError.message);
                        return reject(new Error(`Supabase bağlantı hatası: ${bucketError.message}`));
                    }
                    
                    const bucketExists = buckets?.some(b => b.name === 'analiz-raporlari');
                    if (!bucketExists) {
                        console.error("❌ 'analiz-raporlari' bucket'ı bulunamadı!");
                        console.error("Mevcut bucket'lar:", buckets?.map(b => b.name).join(', ') || 'Yok');
                        return reject(new Error("'analiz-raporlari' bucket'ı Supabase'de mevcut değil. Lütfen bucket'ı oluşturun."));
                    }
                    
                    console.log("✅ Supabase bucket kontrolü başarılı");
                    
                    // Her zaman UUID ile yeni dosya oluştur (overwrite yok)
                    const fileName = `reports/${reportName}-${crypto.randomUUID()}.pdf`;
                    console.log(`📤 Dosya yükleniyor: ${fileName}`);
                    
                    const { data: uploadData, error: uploadError } = await supabase.storage
                        .from('analiz-raporlari')
                        .upload(fileName, pdfData, { contentType: 'application/pdf' });

                    if (uploadError) {
                        console.error("❌ Supabase Yükleme Hatası:", uploadError);
                        console.error("Hata detayları:", JSON.stringify(uploadError, null, 2));
                        return reject(new Error(`Supabase yükleme hatası: ${uploadError.message}`));
                    }

                    const { data: urlData } = supabase.storage
                        .from('analiz-raporlari')
                        .getPublicUrl(fileName);

                    if (!urlData || !urlData.publicUrl) {
                        return reject(new Error("Public URL alınamadı"));
                    }

                    console.log("✅ Yükleme başarılı:", urlData.publicUrl);
                    console.log("📁 Dosya adı:", fileName);
                    resolve(urlData.publicUrl);
                } catch (err) {
                    console.error("❌ PDF yükleme genel hatası:", err);
                    reject(err);
                }
            });

            // --- PDF İÇERİĞİ - FULL WIDTH RENKLİ VE CANLI TASARIM ---
            // Full width için sayfa genişliğini al (landscape A4: 842x595)
            const pageWidth = doc.page.width;
            const pageHeight = doc.page.height;
            const margin = 30;
            const contentWidth = pageWidth - (margin * 2);
            
            // Üst başlık kutusu (full width renkli arka plan)
            const headerBoxY = margin;
            const headerHeight = 60;
            doc.rect(margin, headerBoxY, contentWidth, headerHeight)
               .fillColor('#059669') // Emerald-600
               .fill();
            
            // Başlık (beyaz, kalın)
            doc.fontSize(28)
               .fillColor('#ffffff') // Beyaz
               .text(data.title, margin, headerBoxY + 15, { width: contentWidth, align: 'center' });
            
            // Alt başlık (açık yeşil)
            doc.fontSize(14)
               .fillColor('#d1fae5') // Emerald-100
               .text(data.subtitle || '', margin, headerBoxY + 40, { width: contentWidth, align: 'center' });
            
            let currentY = headerBoxY + headerHeight + 20;

            // Grafik bölümü (eğer grafik verisi varsa)
            if (data.chartData && data.chartData.length > 0) {
                doc.fontSize(16)
                   .fillColor('#059669')
                   .text('📊 Tüketim Grafikleri', margin, currentY, { width: contentWidth });
                currentY += 30;
                
                // Grafik çizimi için basit bir çizgi grafiği
                const chartWidth = contentWidth;
                const chartHeight = 150;
                const chartX = margin;
                const chartY = currentY;
                
                // Grafik arka planı
                doc.rect(chartX, chartY, chartWidth, chartHeight)
                   .fillColor('#f0fdf4')
                   .fill()
                   .strokeColor('#10b981')
                   .lineWidth(1)
                   .stroke();
                
                // Grafik başlığı
                doc.fontSize(12)
                   .fillColor('#059669')
                   .text(data.chartTitle || 'Mahalle Bazlı Tüketim Trendi', chartX + 10, chartY + 10);
                
                // Basit çizgi grafiği çiz
                if (data.chartData.length > 1) {
                    const dataPoints = data.chartData;
                    const maxValue = Math.max(...dataPoints.map(d => d.value || 0));
                    const minValue = Math.min(...dataPoints.map(d => d.value || 0));
                    const range = maxValue - minValue || 1;
                    const chartInnerWidth = chartWidth - 40;
                    const chartInnerHeight = chartHeight - 50;
                    
                    // Y ekseni etiketleri
                    doc.fontSize(8)
                       .fillColor('#6b7280');
                    for (let i = 0; i <= 5; i++) {
                        const value = maxValue - (range * i / 5);
                        const y = chartY + 30 + (chartInnerHeight * i / 5);
                        doc.text(value.toFixed(0), chartX + 5, y - 5);
                    }
                    
                    // Çizgi grafiği
                    doc.strokeColor('#3b82f6')
                       .lineWidth(2);
                    
                    const pointSpacing = dataPoints.length > 1 ? chartInnerWidth / (dataPoints.length - 1) : chartInnerWidth;
                    const points = [];
                    
                    dataPoints.forEach((point, index) => {
                        const x = chartX + 30 + (pointSpacing * index);
                        const normalizedValue = range > 0 ? (point.value - minValue) / range : 0.5;
                        const y = chartY + chartInnerHeight + 20 - (normalizedValue * chartInnerHeight);
                        points.push({ x, y });
                        
                        // Nokta çiz
                        doc.circle(x, y, 3)
                           .fillColor('#3b82f6')
                           .fill();
                    });
                    
                    // Çizgileri çiz
                    if (points.length > 1) {
                        for (let i = 0; i < points.length - 1; i++) {
                            doc.moveTo(points[i].x, points[i].y)
                               .lineTo(points[i + 1].x, points[i + 1].y)
                               .stroke();
                        }
                    }
                    
                    // X ekseni etiketleri
                    doc.fontSize(7)
                       .fillColor('#6b7280');
                    dataPoints.forEach((point, index) => {
                        const x = chartX + 30 + (pointSpacing * index);
                        const label = point.label || point.mahalle || `${index + 1}`;
                        doc.text(label.substring(0, 8), x - 15, chartY + chartHeight - 15, { width: 30, align: 'center' });
                    });
                }
                
                currentY += chartHeight + 30;
            }
            
            // Tablo bölümü
            if (data.tableData && data.tableData.length > 0) {
                // Resource'a göre kolonları belirle
                const resource = data.subtitle?.toLowerCase() || 'all';
                const showAll = resource === 'tüm kaynaklar' || resource === 'all';
                const showElektrik = showAll || resource === 'elektrik';
                const showSu = showAll || resource === 'su';
                const showDogalgaz = showAll || resource === 'doğalgaz';
                
                // Kolonları ve genişlikleri belirle (full width için optimize)
                const columns = [];
                const columnCount = 1 + (showElektrik ? 1 : 0) + (showSu ? 1 : 0) + (showDogalgaz ? 1 : 0);
                const baseColumnWidth = contentWidth / columnCount;
                
                columns.push({ name: 'MAHALLE', width: baseColumnWidth * 1.2 });
                if (showElektrik) columns.push({ name: 'ELEKTRİK', width: baseColumnWidth * 0.9 });
                if (showSu) columns.push({ name: 'SU', width: baseColumnWidth * 0.9 });
                if (showDogalgaz) columns.push({ name: 'DOĞALGAZ', width: baseColumnWidth * 0.9 });
                
                const startX = margin;
                const tableTop = currentY;
                const totalWidth = contentWidth;
                const rowHeight = 30;
                const headerHeight = 35;
                
                // Tablo başlık arka planı (renkli gradient efekti)
                doc.rect(startX, tableTop, totalWidth, headerHeight)
                   .fillColor('#10b981') // Emerald-500
                   .fill();
                
                // Başlık metinleri (beyaz, kalın)
                doc.fontSize(11)
                   .fillColor('#ffffff') // Beyaz
                   .font('TurkishFont');
                
                let currentX = startX + 8;
                columns.forEach((col, idx) => {
                    doc.text(col.name, currentX, tableTop + 10, { width: col.width - 16, align: 'left' });
                    if (idx > 0) { // Mahalle hariç
                        doc.fontSize(8)
                           .fillColor('#fef3c7')
                           .text('(Ort/Zirve/Düşük)', currentX, tableTop + 22, { width: col.width - 16 });
                        doc.fontSize(11)
                           .fillColor('#ffffff');
                    }
                    currentX += col.width;
                });
                
                // Tablo verileri
                let tableY = tableTop + headerHeight;
                data.tableData.forEach((item, index) => {
                    // Sayfa sonu kontrolü
                    if (tableY + rowHeight > pageHeight - margin - 100) {
                        doc.addPage();
                        tableY = margin + 20;
                    }
                    
                    // Renkli satır arka planları (alternatif renkler)
                    if (index % 2 === 0) {
                        doc.rect(startX, tableY, totalWidth, rowHeight)
                           .fillColor('#ecfdf5') // Emerald-50
                           .fill();
                    } else {
                        doc.rect(startX, tableY, totalWidth, rowHeight)
                           .fillColor('#f0fdf4') // Green-50
                           .fill();
                    }
                    
                    // Renkli satır kenarlığı
                    doc.rect(startX, tableY, totalWidth, rowHeight)
                       .strokeColor('#10b981') // Emerald-500
                       .lineWidth(0.5)
                       .stroke();
                    
                    // Veri metinleri
                    doc.fontSize(9);
                    let dataX = startX + 8;
                    
                    // Mahalle
                    doc.fillColor('#059669')
                       .text(item.Mahalle || 'N/A', dataX, tableY + 8, { width: columns[0].width - 16, align: 'left' });
                    dataX += columns[0].width;
                    
                    // Elektrik
                    if (showElektrik) {
                        doc.fillColor('#92400e')
                           .text(item.Elektrik !== '-' ? item.Elektrik : 'Veri Yok', dataX, tableY + 8, { width: columns[1].width - 16, align: 'left' });
                        dataX += columns[1].width;
                    }
                    
                    // Su
                    if (showSu) {
                        const suColIdx = showElektrik ? 2 : 1;
                        doc.fillColor('#1e40af')
                           .text(item.Su !== '-' ? item.Su : 'Veri Yok', dataX, tableY + 8, { width: columns[suColIdx].width - 16, align: 'left' });
                        dataX += columns[suColIdx].width;
                    }
                    
                    // Doğalgaz
                    if (showDogalgaz) {
                        const dogColIdx = columns.length - 1;
                        doc.fillColor('#9a3412')
                           .text(item.Dogalgaz !== '-' ? item.Dogalgaz : 'Veri Yok', dataX, tableY + 8, { width: columns[dogColIdx].width - 16, align: 'left' });
                    }
                    
                    tableY += rowHeight;
                });
                
                currentY = tableY + 20;
                
                // Tablo alt kenarlığı (kalın, renkli)
                doc.rect(startX, tableY, totalWidth, 3)
                   .fillColor('#059669') // Emerald-600
                   .fill();
                
            } else {
                doc.fontSize(14)
                   .fillColor('#dc2626') // Red-600
                   .text("Gösterilecek veri bulunamadı.", margin, currentY, { width: contentWidth, align: 'center' });
                currentY += 30;
            }
            
            // Şehir Ortalamaları Bölümü
            if (data.cityAverages) {
                // Yeni sayfa gerekirse ekle
                if (currentY > pageHeight - margin - 150) {
                    doc.addPage();
                    currentY = margin + 20;
                }
                
                doc.fontSize(16)
                   .fillColor('#059669')
                   .text('🏙️ Şehir Geneli Ortalama Tüketim Özeti', margin, currentY, { width: contentWidth });
                currentY += 30;
                
                const avgBoxHeight = 80;
                const avgBoxWidth = (contentWidth - 20) / 3;
                
                // Elektrik Ortalaması
                doc.rect(margin, currentY, avgBoxWidth, avgBoxHeight)
                   .fillColor('#fef3c7')
                   .fill()
                   .strokeColor('#f59e0b')
                   .lineWidth(2)
                   .stroke();
                
                doc.fontSize(12)
                   .fillColor('#92400e')
                   .text('ELEKTRİK', margin + 10, currentY + 10);
                doc.fontSize(20)
                   .fillColor('#78350f')
                   .text(`${(data.cityAverages.elektrik || 0).toFixed(2)} kWh`, margin + 10, currentY + 30);
                
                // Su Ortalaması
                doc.rect(margin + avgBoxWidth + 10, currentY, avgBoxWidth, avgBoxHeight)
                   .fillColor('#dbeafe')
                   .fill()
                   .strokeColor('#3b82f6')
                   .lineWidth(2)
                   .stroke();
                
                doc.fontSize(12)
                   .fillColor('#1e40af')
                   .text('SU', margin + avgBoxWidth + 20, currentY + 10);
                doc.fontSize(20)
                   .fillColor('#1e3a8a')
                   .text(`${(data.cityAverages.su || 0).toFixed(2)} m³`, margin + avgBoxWidth + 20, currentY + 30);
                
                // Doğalgaz Ortalaması
                doc.rect(margin + (avgBoxWidth + 10) * 2, currentY, avgBoxWidth, avgBoxHeight)
                   .fillColor('#fee2e2')
                   .fill()
                   .strokeColor('#ef4444')
                   .lineWidth(2)
                   .stroke();
                
                doc.fontSize(12)
                   .fillColor('#9a3412')
                   .text('DOĞALGAZ', margin + (avgBoxWidth + 10) * 2 + 10, currentY + 10);
                doc.fontSize(20)
                   .fillColor('#7f1d1d')
                   .text(`${(data.cityAverages.dogalgaz || 0).toFixed(2)} m³`, margin + (avgBoxWidth + 10) * 2 + 10, currentY + 30);
                
                currentY += avgBoxHeight + 30;
            }
            
            // Mevsimsel Analiz Bölümü (Grafik + Metin)
            if (data.seasonalAnalysis && Object.keys(data.seasonalAnalysis).length > 0) {
                // Yeni sayfa gerekirse ekle
                if (currentY > pageHeight - margin - 250) {
                    doc.addPage();
                    currentY = margin + 20;
                }
                
                doc.fontSize(16)
                   .fillColor('#059669')
                   .text('🍂 Mevsimsel Tüketim Analizi', margin, currentY, { width: contentWidth });
                currentY += 30;
                
                const seasonMap = {
                    'kış': 'Kış',
                    'ilkbahar': 'İlkbahar',
                    'yaz': 'Yaz',
                    'sonbahar': 'Sonbahar'
                };
                
                const seasons = Object.keys(data.seasonalAnalysis).map(key => ({
                    key: key,
                    name: seasonMap[key] || key,
                    data: data.seasonalAnalysis[key]
                }));
                
                // MEVSİMSEL GRAFİK (Bar Chart) - Düzeltilmiş versiyon
                const chartWidth = contentWidth;
                const chartHeight = 200;
                const chartX = margin;
                const chartY = currentY;
                
                // Grafik arka planı
                doc.rect(chartX, chartY, chartWidth, chartHeight)
                   .fillColor('#f9fafb')
                   .fill()
                   .strokeColor('#10b981')
                   .lineWidth(2)
                   .stroke();
                
                // Grafik başlığı
                doc.fontSize(14)
                   .fillColor('#059669')
                   .font('TurkishFont')
                   .text('Mevsimsel Ortalama Tüketim Trendi', chartX + 10, chartY + 10, { width: chartWidth - 20, align: 'center' });
                
                // Kaynak bazlı grafikler (3 kaynak için 3 bar chart)
                const resourceColors = {
                    elektrik: '#f59e0b',
                    su: '#3b82f6',
                    dogalgaz: '#ef4444'
                };
                
                const resources = ['elektrik', 'su', 'dogalgaz'];
                const chartInnerHeight = chartHeight - 80; // Daha fazla alan
                const chartInnerY = chartY + 40;
                const chartInnerWidth = chartWidth - 100; // Y ekseni için alan bırak
                const chartInnerX = chartX + 60;
                
                // Y ekseni etiketleri için max değeri bul
                const maxValue = Math.max(
                    ...seasons.map(s => Math.max(
                        s.data.elektrik || 0,
                        s.data.su || 0,
                        s.data.dogalgaz || 0
                    ))
                );
                const minValue = 0;
                const range = maxValue - minValue || 1;
                
                // Y ekseni çizgisi
                doc.strokeColor('#d1d5db')
                   .lineWidth(1)
                   .moveTo(chartInnerX, chartInnerY)
                   .lineTo(chartInnerX, chartInnerY + chartInnerHeight)
                   .stroke();
                
                // Y ekseni etiketleri
                doc.fontSize(9)
                   .fillColor('#6b7280')
                   .font('TurkishFont');
                for (let i = 0; i <= 5; i++) {
                    const value = maxValue - (range * i / 5);
                    const y = chartInnerY + (chartInnerHeight * i / 5);
                    // Y ekseni çizgisi
                    doc.strokeColor('#e5e7eb')
                       .lineWidth(0.5)
                       .moveTo(chartInnerX, y)
                       .lineTo(chartInnerX + chartInnerWidth, y)
                       .stroke();
                    // Etiket
                    doc.text(value.toFixed(0), chartInnerX - 50, y - 5, { width: 45, align: 'right' });
                }
                
                // Bar chart çizimi - Düzeltilmiş hesaplama
                const seasonGroupWidth = chartInnerWidth / seasons.length; // Her mevsim grubu için genişlik
                const barWidth = (seasonGroupWidth - 20) / 3; // Her bar için genişlik (3 bar + boşluklar)
                const barSpacing = 5; // Bar'lar arası boşluk
                
                seasons.forEach((season, seasonIdx) => {
                    const groupStartX = chartInnerX + (seasonIdx * seasonGroupWidth) + 10;
                    
                    resources.forEach((resource, resIdx) => {
                        const value = season.data[resource] || 0;
                        const normalizedValue = range > 0 ? (value - minValue) / range : 0;
                        const barHeight = normalizedValue * chartInnerHeight;
                        const barX = groupStartX + resIdx * (barWidth + barSpacing);
                        const barY = chartInnerY + chartInnerHeight - barHeight;
                        
                        // Bar çiz (daha kalın ve görünür)
                        if (barHeight > 0) {
                            doc.rect(barX, barY, barWidth, barHeight)
                               .fillColor(resourceColors[resource])
                               .fill()
                               .strokeColor('#ffffff')
                               .lineWidth(1)
                               .stroke();
                            
                            // Değer etiketi (bar üzerinde veya içinde)
                            if (barHeight > 20) {
                                doc.fontSize(8)
                                   .fillColor('#1f2937')
                                   .font('TurkishFont')
                                   .text(value.toFixed(0), barX, barY - 15, { width: barWidth, align: 'center' });
                            } else if (barHeight > 5) {
                                // Bar içinde küçük yazı
                                doc.fontSize(7)
                                   .fillColor('#ffffff')
                                   .font('TurkishFont')
                                   .text(value.toFixed(0), barX, barY + barHeight / 2 - 5, { width: barWidth, align: 'center' });
                            }
                        }
                    });
                    
                    // Mevsim etiketi (X ekseni altında)
                    doc.fontSize(9)
                       .fillColor('#059669')
                       .font('TurkishFont')
                       .text(season.name, groupStartX, chartInnerY + chartInnerHeight + 10, { width: seasonGroupWidth - 20, align: 'center' });
                });
                
                // X ekseni çizgisi
                doc.strokeColor('#d1d5db')
                   .lineWidth(1)
                   .moveTo(chartInnerX, chartInnerY + chartInnerHeight)
                   .lineTo(chartInnerX + chartInnerWidth, chartInnerY + chartInnerHeight)
                   .stroke();
                
                // Legend (Açıklama) - Ortalanmış ve daha aşağıda
                const legendY = chartY + chartHeight + 12; // Grafiğin altında, 12px boşluk
                const legendTotalWidth = 250; // Toplam legend genişliği
                const legendStartX = chartX + (chartWidth - legendTotalWidth) / 2; // Ortalanmış
                
                doc.fontSize(9)
                   .fillColor('#1f2937')
                   .font('TurkishFont')
                   .text('Açıklama:', legendStartX, legendY);
                
                let legendX = legendStartX + 60;
                const legendItemSpacing = 75; // Her item arası boşluk
                
                resources.forEach((resource, idx) => {
                    // Renk kutusu
                    doc.rect(legendX, legendY, 12, 12)
                       .fillColor(resourceColors[resource])
                       .fill()
                       .strokeColor('#ffffff')
                       .lineWidth(0.5)
                       .stroke();
                    
                    // Kaynak adı
                    const resourceName = resource === 'elektrik' ? 'Elektrik' : 
                                        resource === 'su' ? 'Su' : 'Doğalgaz';
                    doc.fontSize(9)
                       .fillColor('#1f2937')
                       .font('TurkishFont')
                       .text(resourceName, legendX + 18, legendY + 2);
                    
                    legendX += legendItemSpacing;
                });
                
                currentY += chartHeight + 40; // Legend için ekstra alan
                
                // Mevsim detay kutuları (metin)
                const seasonWidth = (contentWidth - 30) / 4;
                const seasonHeight = 100;
                
                seasons.forEach((season, idx) => {
                    const seasonX = margin + idx * (seasonWidth + 10);
                    
                    if (currentY + seasonHeight > pageHeight - margin - 50) {
                        doc.addPage();
                        currentY = margin + 20;
                    }
                    
                    const seasonData = season.data || {};
                    
                    // Mevsim kutusu
                    doc.rect(seasonX, currentY, seasonWidth, seasonHeight)
                       .fillColor('#f0fdf4')
                       .fill()
                       .strokeColor('#10b981')
                       .lineWidth(1.5)
                       .stroke();
                    
                    // Mevsim adı
                    doc.fontSize(12)
                       .fillColor('#059669')
                       .text(season.name, seasonX + 5, currentY + 5, { width: seasonWidth - 10, align: 'center' });
                    
                    let textY = currentY + 25;
                    doc.fontSize(8);
                    
                    // Elektrik - Renk kutusu + yazı
                    if (seasonData.elektrik !== undefined) {
                        // Renk kutusu
                        doc.rect(seasonX + 5, textY, 8, 8)
                           .fillColor('#f59e0b')
                           .fill()
                           .strokeColor('#ffffff')
                           .lineWidth(0.5)
                           .stroke();
                        // Yazı
                        doc.fillColor('#92400e')
                           .font('TurkishFont')
                           .text(`Elektrik: ${seasonData.elektrik.toFixed(2)} kWh`, seasonX + 16, textY + 1, { width: seasonWidth - 20 });
                        textY += 20;
                    }
                    
                    // Su - Renk kutusu + yazı
                    if (seasonData.su !== undefined) {
                        // Renk kutusu
                        doc.rect(seasonX + 5, textY, 8, 8)
                           .fillColor('#3b82f6')
                           .fill()
                           .strokeColor('#ffffff')
                           .lineWidth(0.5)
                           .stroke();
                        // Yazı
                        doc.fillColor('#1e40af')
                           .font('TurkishFont')
                           .text(`Su: ${seasonData.su.toFixed(2)} m³`, seasonX + 16, textY + 1, { width: seasonWidth - 20 });
                        textY += 20;
                    }
                    
                    // Doğalgaz - Renk kutusu + yazı
                    if (seasonData.dogalgaz !== undefined) {
                        // Renk kutusu
                        doc.rect(seasonX + 5, textY, 8, 8)
                           .fillColor('#ef4444')
                           .fill()
                           .strokeColor('#ffffff')
                           .lineWidth(0.5)
                           .stroke();
                        // Yazı
                        doc.fillColor('#9a3412')
                           .font('TurkishFont')
                           .text(`Doğalgaz: ${seasonData.dogalgaz.toFixed(2)} m³`, seasonX + 16, textY + 1, { width: seasonWidth - 20 });
                    }
                });
                
                currentY += seasonHeight + 20;
            }

            doc.end();

        } catch (criticalError) {
            console.error("❌ PDF Başlatma Hatası:", criticalError.message);
            reject(criticalError);
        }
    });
};
const PDFDocument = require('pdfkit');
const supabase = require('../config/supabase');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs'); // Dosya kontrolü için gerekli

exports.generateAndUploadReport = async (data, reportName) => {
    return new Promise((resolve, reject) => {
        try {
            // 1. Font dosyasının yolunu kontrol et
            const fontPath = path.join(__dirname, '../assets/fonts/Arial.ttf');
            
            if (!fs.existsSync(fontPath)) {
                console.error("❌ HATA: Font dosyası bulunamadı ->", fontPath);
                return reject(new Error("Font dosyasi bulunamadi. Lutfen assets/fonts/Arial.ttf dosyasini ekleyin."));
            }

            const doc = new PDFDocument({ margin: 50 });
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
                    const fileName = `reports/${reportName}-${crypto.randomUUID()}.pdf`;

                    const { data: uploadData, error } = await supabase.storage
                        .from('analiz-raporlari')
                        .upload(fileName, pdfData, { contentType: 'application/pdf' });

                    if (error) {
                        console.error("❌ Supabase Yükleme Hatası:", error.message);
                        return reject(error);
                    }

                    const { data: urlData } = supabase.storage
                        .from('analiz-raporlari')
                        .getPublicUrl(fileName);

                    console.log("✅ Yükleme başarılı:", urlData.publicUrl);
                    console.log("📁 Dosya adı:", fileName);
                    console.log("📋 Belgeler listesinde görünmesi için frontend yenilenecek");
                    resolve(urlData.publicUrl);
                } catch (err) {
                    reject(err);
                }
            });

            // --- PDF İÇERİĞİ - RENKLİ VE CANLI TASARIM ---
            // Üst başlık kutusu (renkli arka plan)
            const headerBoxY = 50;
            doc.rect(50, headerBoxY, 500, 60)
               .fillColor('#059669') // Emerald-600
               .fill();
            
            // Başlık (beyaz, kalın)
            doc.fontSize(26)
               .fillColor('#ffffff') // Beyaz
               .text(data.title, 50, headerBoxY + 15, { width: 500, align: 'center' });
            
            // Alt başlık (açık yeşil)
            doc.fontSize(13)
               .fillColor('#d1fae5') // Emerald-100
               .text(data.subtitle || '', 50, headerBoxY + 40, { width: 500, align: 'center' });
            
            doc.moveDown(3);

            if (data.tableData && data.tableData.length > 0) {
                // Resource'a göre kolonları belirle
                const resource = data.subtitle?.toLowerCase() || 'all';
                const showAll = resource === 'tüm kaynaklar' || resource === 'all';
                const showElektrik = showAll || resource === 'elektrik';
                const showSu = showAll || resource === 'su';
                const showDogalgaz = showAll || resource === 'doğalgaz';
                
                // Kolonları ve genişlikleri belirle
                const columns = [];
                columns.push({ name: 'MAHALLE', width: 150 });
                if (showElektrik) columns.push({ name: 'ELEKTRİK', width: 120 });
                if (showSu) columns.push({ name: 'SU', width: 120 });
                if (showDogalgaz) columns.push({ name: 'DOĞALGAZ', width: 120 });
                
                const startX = 50;
                const tableTop = doc.y;
                const totalWidth = columns.reduce((sum, col) => sum + col.width, 0);
                const rowHeight = 35;
                const headerHeight = 40;
                
                // Tablo başlık arka planı (renkli gradient efekti)
                doc.rect(startX, tableTop, totalWidth, headerHeight)
                   .fillColor('#10b981') // Emerald-500
                   .fill();
                
                // Başlık metinleri (beyaz, kalın)
                doc.fontSize(12)
                   .fillColor('#ffffff') // Beyaz
                   .font('TurkishFont');
                
                let currentX = startX + 10;
                columns.forEach((col, idx) => {
                    doc.text(col.name, currentX, tableTop + 12, { width: col.width - 20, align: 'left' });
                    if (idx > 0) { // Mahalle hariç
                        doc.fontSize(9)
                           .fillColor('#fef3c7')
                           .text('(Ort/Zirve/Düşük)', currentX, tableTop + 28, { width: col.width - 20 });
                        doc.fontSize(12)
                           .fillColor('#ffffff');
                    }
                    currentX += col.width;
                });
                
                // Tablo verileri
                let currentY = tableTop + headerHeight;
                data.tableData.forEach((item, index) => {
                    // Renkli satır arka planları (alternatif renkler)
                    if (index % 2 === 0) {
                        doc.rect(startX, currentY, totalWidth, rowHeight)
                           .fillColor('#ecfdf5') // Emerald-50
                           .fill();
                    } else {
                        doc.rect(startX, currentY, totalWidth, rowHeight)
                           .fillColor('#f0fdf4') // Green-50
                           .fill();
                    }
                    
                    // Renkli satır kenarlığı
                    doc.rect(startX, currentY, totalWidth, rowHeight)
                       .fillColor('#10b981') // Emerald-500
                       .stroke();
                    
                    // Veri metinleri
                    doc.fontSize(11);
                    currentX = startX + 10;
                    
                    // Mahalle
                    doc.fillColor('#059669')
                       .text(item.Mahalle || 'N/A', currentX, currentY + 10, { width: columns[0].width - 20, align: 'left' });
                    currentX += columns[0].width;
                    
                    // Elektrik
                    if (showElektrik) {
                        doc.fillColor('#92400e')
                           .text(item.Elektrik !== '-' ? item.Elektrik : 'Veri Yok', currentX, currentY + 10, { width: columns[1].width - 20, align: 'left' });
                        currentX += columns[1].width;
                    }
                    
                    // Su
                    if (showSu) {
                        const suColIdx = showElektrik ? 2 : 1;
                        doc.fillColor('#1e40af')
                           .text(item.Su !== '-' ? item.Su : 'Veri Yok', currentX, currentY + 10, { width: columns[suColIdx].width - 20, align: 'left' });
                        currentX += columns[suColIdx].width;
                    }
                    
                    // Doğalgaz
                    if (showDogalgaz) {
                        const dogColIdx = columns.length - 1;
                        doc.fillColor('#9a3412')
                           .text(item.Dogalgaz !== '-' ? item.Dogalgaz : 'Veri Yok', currentX, currentY + 10, { width: columns[dogColIdx].width - 20, align: 'left' });
                    }
                    
                    currentY += rowHeight;
                    
                    // Sayfa sonu kontrolü
                    if (currentY > 750) {
                        doc.addPage();
                        currentY = 50;
                    }
                });
                
                // Tablo alt kenarlığı (kalın, renkli)
                doc.rect(startX, currentY, totalWidth, 3)
                   .fillColor('#059669') // Emerald-600
                   .fill();
                
            } else {
                doc.fontSize(14)
                   .fillColor('#dc2626') // Red-600
                   .text("Gösterilecek veri bulunamadı.", { align: 'center' });
            }

            doc.end();

        } catch (criticalError) {
            console.error("❌ PDF Başlatma Hatası:", criticalError.message);
            reject(criticalError);
        }
    });
};
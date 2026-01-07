const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

/**
 * Generate Monthly Report PDF
 * KESİN ÇÖZÜM: Fontları Buffer olarak okuyup yükleme
 */
const generateMonthlyReport = async (options) => {
    return new Promise((resolve, reject) => {
        try {
            const { month, year, mahalle, sections } = options;

            if (!month || !year || !mahalle) {
                return reject(new Error('Eksik parametreler: month, year, mahalle'));
            }

            console.log('📝 PDF Başlatılıyor...');

            // ==========================================
            // 1. ADIM: FONTLARI "BUFFER" OLARAK OKU (KESİN YÖNTEM)
            // ==========================================
            // Klasör yolundaki boşlukları (yedek proje /) aşmak için fs.readFileSync kullanıyoruz.
            const fontDir = path.join(__dirname, '../assets/fonts');
            const regularPath = path.join(fontDir, 'Roboto-Regular.ttf');
            const boldPath = path.join(fontDir, 'Roboto-Bold.ttf');

            let regularBuffer = null;
            let boldBuffer = null;

            try {
                // Dosyaları direkt hafızaya alıyoruz
                if (fs.existsSync(regularPath)) regularBuffer = fs.readFileSync(regularPath);
                if (fs.existsSync(boldPath)) boldBuffer = fs.readFileSync(boldPath);
                
                console.log('✅ Fontlar hafızaya (Buffer) okundu.');
            } catch (err) {
                console.error('❌ Font okuma hatası:', err.message);
            }

            // ==========================================
            // 2. ADIM: PDF OLUŞTUR VE FONTLARI KAYDET
            // ==========================================
            const doc = new PDFDocument({
                margin: 50,
                size: 'A4',
                bufferPages: true,
                info: { Title: `Rapor - ${mahalle}`, Author: 'Sistem' }
            });

            // Fontları isimlendirerek kaydet
            if (regularBuffer) doc.registerFont('TrReg', regularBuffer);
            if (boldBuffer) doc.registerFont('TrBold', boldBuffer);

            // Font seçici fonksiyon (Hata korumalı)
            const font = (type) => {
                if (type === 'bold' && boldBuffer) return 'TrBold';
                if (type === 'regular' && regularBuffer) return 'TrReg';
                return 'Helvetica'; // Eğer font yoksa mecburen bu döner
            };

            const chunks = [];
            doc.on('data', chunk => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', err => reject(err));

            // ==========================================
            // 3. ADIM: TASARIM (Senin kodun, sadece font(...) kısımları değişti)
            // ==========================================
            const pageWidth = doc.page.width;
            const pageHeight = doc.page.height;
            let currentY = 0;

            // --- Header ---
            doc.rect(0, 0, pageWidth, 80).fillColor('#10b981').fill();

            doc.fillColor('#ffffff')
               .fontSize(24)
               .font(font('bold')) // Kalın Font
               .text('KENTSEL TÜKETİM ANALİZ RAPORU', 0, 25, { width: pageWidth, align: 'center' });

            doc.fontSize(12)
               .font(font('regular')) // Normal Font
               .text(`${year} Yılı ${month}. Ay`, 0, 55, { width: pageWidth, align: 'center' });

            currentY = 100;

            // --- Mahalle Kutusu ---
            doc.rect(50, currentY, pageWidth - 100, 50)
               .fillColor('#f0fdf4').fill()
               .strokeColor('#10b981').lineWidth(2).stroke();

            doc.fillColor('#047857')
               .fontSize(20)
               .font(font('bold'))
               .text(mahalle, 60, currentY + 10, { width: pageWidth - 120, align: 'left' });

            const dateText = `Rapor Tarihi: ${new Date().toLocaleDateString('tr-TR')}`;
            doc.fillColor('#059669')
               .fontSize(11)
               .font(font('regular'))
               .text(dateText, 60, currentY + 35, { width: pageWidth - 120, align: 'left' });

            currentY += 80;

            // --- Bölümler Döngüsü ---
            if (!sections || sections.length === 0) {
                doc.fillColor('black').fontSize(12).font(font('regular')).text('Veri yok.', 50, currentY);
            } else {
                sections.forEach((section) => {
                    if (currentY > pageHeight - 200) {
                        doc.addPage();
                        currentY = 50;
                    }

                    // Bölüm Başlığı
                    doc.rect(50, currentY, pageWidth - 100, 40).fill(section.color || '#333');
                    doc.fillColor('white').fontSize(16).font(font('bold')).text(section.title, 60, currentY + 10);
                    currentY += 50;

                    // İstatistikler
                    const stats = section.stats || { average: 0, peak: 0, lowest: 0 };
                    doc.fillColor('black');

                    const col1 = 50, col2 = 200, col3 = 350;

                    doc.fontSize(10).font(font('regular')).text('Ortalama', col1, currentY);
                    doc.fontSize(16).font(font('bold')).text(Number(stats.average).toFixed(2), col1, currentY + 15);
                    
                    doc.fontSize(10).font(font('regular')).text('En Yüksek', col2, currentY);
                    doc.fontSize(16).font(font('bold')).text(Number(stats.peak).toFixed(2), col2, currentY + 15);
                    
                    doc.fontSize(10).font(font('regular')).text('En Düşük', col3, currentY);
                    doc.fontSize(16).font(font('bold')).text(Number(stats.lowest).toFixed(2), col3, currentY + 15);

                    currentY += 50;
                    doc.moveTo(50, currentY).lineTo(pageWidth - 50, currentY).stroke('#ddd');
                    currentY += 20;

                    // Tablo
                    if (section.logs && section.logs.length > 0) {
                        doc.fontSize(12).font(font('bold')).fillColor('#333').text('Detaylı Kayıtlar:', 50, currentY);
                        currentY += 25;

                        section.logs.forEach((log, i) => {
                            if (currentY > pageHeight - 50) {
                                doc.addPage();
                                currentY = 50;
                            }
                            // Zebra Arka Plan
                            if (i % 2 === 0) doc.rect(50, currentY - 5, pageWidth - 100, 20).fillColor('#f9fafb').fill();

                            const logText = `${log.date || '-'}   |   ${Number(log.amount).toFixed(2)} ${log.unit || ''}`;
                            doc.fillColor('#374151').fontSize(10).font(font('regular')).text(logText, 60, currentY);
                            currentY += 20;
                        });
                        currentY += 30;
                    }
                });
            }

            // --- Sayfa Numaraları ---
            const range = doc.bufferedPageRange();
            for (let i = 0; i < range.count; i++) {
                doc.switchToPage(i);
                doc.fontSize(8).font(font('regular')).fillColor('#6b7280')
                   .text(`Sayfa ${i + 1} / ${range.count}`, 50, doc.page.height - 30, { align: 'center', width: pageWidth - 100 });
            }

            doc.end();

        } catch (error) {
            console.error('❌ PDF Hatası:', error);
            reject(error);
        }
    });
};

module.exports = { generateMonthlyReport };
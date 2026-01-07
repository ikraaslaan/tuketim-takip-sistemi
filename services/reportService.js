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
                    resolve(urlData.publicUrl);
                } catch (err) {
                    reject(err);
                }
            });

            // --- PDF İÇERİĞİ ---
            doc.fontSize(20).text(data.title, { align: 'center' });
            doc.fontSize(10).text(data.subtitle || '', { align: 'center' });
            doc.moveDown();

            if (data.tableData && data.tableData.length > 0) {
                data.tableData.forEach((item, index) => {
                    doc.fontSize(11).text(`${index + 1}. Mahalle: ${item.Mahalle}`);
                    doc.fontSize(9)
                       .text(`   > Elektrik (Ort/Zirve/Düşük): ${item.Elektrik || 'Veri Yok'}`)
                       .text(`   > Su (Ort/Zirve/Düşük): ${item.Su || 'Veri Yok'}`)
                       .text(`   > Doğalgaz (Ort/Zirve/Düşük): ${item.Dogalgaz || 'Veri Yok'}`)
                       .moveDown(0.8);
                });
            } else {
                doc.text("Gösterilecek veri bulunamadı.");
            }

            doc.end();

        } catch (criticalError) {
            console.error("❌ PDF Başlatma Hatası:", criticalError.message);
            reject(criticalError);
        }
    });
};
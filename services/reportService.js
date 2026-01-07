const PDFDocument = require('pdfkit');
const supabase = require('../config/supabase');
const crypto = require('crypto');

exports.generateAndUploadReport = async (data, reportName) => {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 50 });
        let buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', async () => { /* ... yükleme mantığı aynı ... */ });

        // --- PDF TASARIMI BAŞLIYOR ---
        
        // 1. Başlık
        doc.fillColor('#444444').fontSize(20).text(data.title, { align: 'center' });
        doc.fontSize(10).text(data.subtitle, { align: 'center' });
        doc.moveDown();

        // 2. Çizgi
        doc.moveTo(50, 100).lineTo(550, 100).stroke();
        doc.moveDown();

        // 3. Verileri Yazdır (JSON.stringify yerine döngü kullanıyoruz)
        if (data.tableData && Array.isArray(data.tableData)) {
            data.tableData.forEach((item, index) => {
                doc.fillColor('#2c3e50').fontSize(12).text(`${index + 1}. Mahalle: ${item.Mahalle}`);
                doc.fillColor('#333').fontSize(10)
                   .text(`   - Elektrik: ${item.Elektrik || '0'} | Su: ${item.Su || '0'} | Gaz: ${item.Dogalgaz || '0'}`)
                   .moveDown(0.5);
            });
        } else {
            doc.text("Gosterilecek veri bulunamadi.");
        }

        doc.end();
    });
};
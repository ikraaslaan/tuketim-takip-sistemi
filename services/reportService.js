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
        if (data.tableData && data.tableData.length > 0) {
    data.tableData.forEach((item, index) => {
        doc.fillColor('#2c3e50').fontSize(11).text(`${index + 1}. Mahalle: ${item.Mahalle}`);
        doc.fillColor('#555').fontSize(9)
           .text(`   > Elektrik (Ort/Zirve/Dusuk): ${item.Elektrik || 'Veri Yok'}`)
           .text(`   > Su (Ort/Zirve/Dusuk): ${item.Su || 'Veri Yok'}`)
           .text(`   > Dogalgaz (Ort/Zirve/Dusuk): ${item.Dogalgaz || 'Veri Yok'}`)
           .moveDown(0.8);
    });
} else {
    doc.fillColor('red').text("Secilen donem icin veritabaninda kayitli veri bulunamadi.");
}

        doc.end();
    });
};
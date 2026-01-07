const PDFDocument = require('pdfkit');
const supabase = require('../config/supabase');
const crypto = require('crypto');
const path = require('path');

exports.generateAndUploadReport = async (data, reportName) => {
    return new Promise((resolve, reject) => {
        // Font yolunu belirle
        const fontPath = path.join(__dirname, '../assets/fonts/Arial.ttf');

        const doc = new PDFDocument({ margin: 50 });
        let buffers = [];
        
        // Fontu belgeye kaydet ve varsayılan yap
        doc.registerFont('TurkishFont', fontPath);
        doc.font('TurkishFont'); 

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', async () => { /* ... yükleme mantığı aynı ... */ });

        // --- TASARIM KISMI ---
        
        // Başlıkta Türkçe karakterleri güvenle kullanabilirsin
        doc.fontSize(20).text(data.title, { align: 'center' });
        doc.moveDown();

        if (data.tableData && data.tableData.length > 0) {
            data.tableData.forEach((item, index) => {
                // Burada item.Mahalle içindeki "Çaydaçıra" gibi kelimeler artık bozulmayacak
                doc.fontSize(11).text(`${index + 1}. Mahalle: ${item.Mahalle}`);
                
                doc.fontSize(9)
                   .text(`   > Elektrik (Ort/Zirve/Düşük): ${item.Elektrik || 'Veri Yok'}`)
                   .text(`   > Su (Ort/Zirve/Düşük): ${item.Su || 'Veri Yok'}`)
                   .text(`   > Doğalgaz (Ort/Zirve/Düşük): ${item.Dogalgaz || 'Veri Yok'}`)
                   .moveDown(0.8);
            });
        }
        
        doc.end();
    });
};
const PDFDocument = require('pdfkit');
const supabase = require('../config/supabase');
const { v4: uuidv4 } = require('uuid');

exports.generateAndUploadReport = async (data, reportName) => {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument();
        let buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', async () => {
            const pdfData = Buffer.concat(buffers);
            const fileName = `reports/${reportName}-${Date.now()}.pdf`;

            // Supabase Storage'a Yükle
            const { data: uploadData, error } = await supabase.storage
                .from('analiz-raporlari') // Supabase'de bu isimde bir bucket oluşturmalısın
                .upload(fileName, pdfData, { contentType: 'application/pdf' });

            if (error) reject(error);
            
            // Dosyanın URL'ini al
            const { data: urlData } = supabase.storage
                .from('analiz-raporlari')
                .getPublicUrl(fileName);

            resolve(urlData.publicUrl);
        });

        // PDF İçeriği (Örnek)
        doc.fontSize(20).text('Analitik Rapor Özeti', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(JSON.stringify(data, null, 2));
        doc.end();
    });
};
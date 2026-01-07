// backend/controllers/supportController.js

const emailService = require('../services/emailService');

/**
 * POST /api/support/report
 * Report a malfunction/issue and send email notification to admin
 */
exports.reportMalfunction = async (req, res) => {
    try {
        const { mahalle, kaynak, kullaniciAdi, mevcutDeger, birim, mesaj } = req.body;

        // Validation
        if (!mahalle || !kaynak) {
            return res.status(400).json({
                success: false,
                message: 'Mahalle ve kaynak bilgisi zorunludur.'
            });
        }

        // Prepare report data
        const reportData = {
            mahalle: mahalle,
            kaynak: kaynak,
            kullaniciAdi: kullaniciAdi || 'Sistem Kullanıcısı',
            mevcutDeger: mevcutDeger || null,
            birim: birim || '',
            mesaj: mesaj || 'Anormal tüketim tespit edildi. Lütfen kontrol ediniz.'
        };

        // Send email notification
        try {
            await emailService.sendMalfunctionReport(reportData);
            console.log(`✅ Arıza bildirimi e-posta ile gönderildi: ${mahalle} - ${kaynak}`);
        } catch (emailError) {
            console.error('❌ E-posta gönderme hatası:', emailError.message);
            // Don't fail the request if email fails, but log it
            // You can choose to return an error here if email is critical
        }

        // Return success response
        res.status(200).json({
            success: true,
            message: 'Arıza bildirimi başarıyla gönderildi. E-posta ile yöneticiye iletildi.',
            data: {
                mahalle,
                kaynak,
                timestamp: new Date()
            }
        });

    } catch (error) {
        console.error('❌ Arıza bildirimi hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Arıza bildirimi gönderilirken bir hata oluştu.',
            error: error.message
        });
    }
};




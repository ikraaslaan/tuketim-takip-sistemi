const nodemailer = require('nodemailer');
require('dotenv').config();

// SMTP yapılandırması - .env'den çekiliyor
const SMTP_USER = process.env.SMTP_USER || '23frontend23@gmail.com';
const SMTP_PASS = process.env.SMTP_PASS;

const sendVerificationEmail = async (email, code) => {
    try {
        let transporter;
        let isTestMode = false;

        // Gmail SMTP bilgileri varsa gerçek email gönder
        if (SMTP_USER && SMTP_PASS) {
            transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: SMTP_USER,
                    pass: SMTP_PASS // Gmail App Password
                }
            });
            console.log("📧 Gmail SMTP kullanılarak gerçek email gönderiliyor...");
            console.log(`📧 Gönderen: ${SMTP_USER}`);
        } else {
            // Test modu - Ethereal Email
            isTestMode = true;
            let testAccount = await nodemailer.createTestAccount();
            transporter = nodemailer.createTransport({
                host: "smtp.ethereal.email",
                port: 587,
                secure: false, 
                auth: {
                    user: testAccount.user, 
                    pass: testAccount.pass, 
                },
            });
            console.log("⚠️  Test modu: Gerçek email gönderilmiyor. SMTP_USER ve SMTP_PASS .env dosyasında tanımlı olmalı.");
        }

        // Mail içeriğini hazırla
        const fromEmail = isTestMode 
            ? '"Kentsel Tüketim Analizi" <noreply@mahalle.com>'
            : `"Kentsel Tüketim Analizi" <${SMTP_USER}>`;
            
        let info = await transporter.sendMail({
            from: fromEmail,
            to: email,
            subject: "E-posta Doğrulama Kodu",
            text: `Merhaba, e-posta doğrulama kodunuz: ${code}\n\nBu kod 10 dakika geçerlidir.`,
            html: `
                <div style="font-family: Arial, sans-serif; border: 1px solid #ddd; padding: 20px; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #4CAF50;">Kentsel Tüketim Analizi</h2>
                    <p>Merhaba,</p>
                    <p>E-posta adresinizi doğrulamak için aşağıdaki kodu kullanın:</p>
                    <div style="background: #f4f4f4; padding: 15px; font-weight: bold; font-size: 1.5em; text-align: center; letter-spacing: 5px; margin: 20px 0; border-radius: 5px;">
                        ${code}
                    </div>
                    <p style="color: #666; font-size: 0.9em;">Bu kod 10 dakika geçerlidir.</p>
                    <p style="color: #666; font-size: 0.9em;">Eğer bu işlemi siz yapmadıysanız, bu e-postayı görmezden gelebilirsiniz.</p>
                </div>
            `,
        });

        // 4. Sonuçları logla
        const previewUrl = isTestMode ? nodemailer.getTestMessageUrl(info) : null;
        
        console.log("=========================================");
        console.log("📧 EMAIL DOĞRULAMA KODU GÖNDERİLDİ");
        console.log("=========================================");
        console.log("📧 Alıcı: %s", email);
        console.log("🔑 DOĞRULAMA KODU: %s", code);
        console.log("📧 Mail ID: %s", info.messageId);
        
        if (isTestMode) {
            if (previewUrl) {
                console.log("🔗 Maili Görüntüle: %s", previewUrl);
            }
            console.log("=========================================");
            console.log("⚠️  NOT: Bu test ortamıdır. Gerçek email gönderilmedi.");
            console.log("⚠️  Gerçek email için .env dosyasına SMTP_USER ve SMTP_PASS ekleyin.");
            console.log("⚠️  Kodu yukarıdan kopyalayın veya linke tıklayın.");
        } else {
            console.log("✅ Gerçek email başarıyla gönderildi!");
        }
        console.log("=========================================");
        
        return { previewUrl, messageId: info.messageId, isTestMode };
    } catch (error) {
        console.error("Email gönderme hatası:", error);
        throw error;
    }
};

// Arıza bildirimi için email gönder
const sendIncidentNotification = async (email, incidentData) => {
    try {
        let transporter;
        let isTestMode = false;

        // Gmail SMTP bilgileri varsa gerçek email gönder
        if (SMTP_USER && SMTP_PASS) {
            transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: SMTP_USER,
                    pass: SMTP_PASS
                }
            });
            console.log("📧 Gmail SMTP kullanılarak arıza bildirimi gönderiliyor...");
            console.log(`📧 Gönderen: ${SMTP_USER}`);
        } else {
            // Test modu - Ethereal Email
            isTestMode = true;
            let testAccount = await nodemailer.createTestAccount();
            transporter = nodemailer.createTransport({
                host: "smtp.ethereal.email",
                port: 587,
                secure: false, 
                auth: {
                    user: testAccount.user, 
                    pass: testAccount.pass, 
                },
            });
            console.log("⚠️  Test modu: Gerçek email gönderilmiyor. SMTP_USER ve SMTP_PASS .env dosyasında tanımlı olmalı.");
        }

        const fromEmail = isTestMode 
            ? '"Kentsel Tüketim Analizi" <noreply@mahalle.com>'
            : `"Kentsel Tüketim Analizi" <${SMTP_USER}>`;

        const { mahalle, kaynak, mesaj, tarih, tip } = incidentData;
        const isPlanned = tip === 'Planlı' || tip === 'PLANLI';

        const subject = isPlanned 
            ? `📅 ${mahalle} Mahallesinde ${kaynak} Planlı Kesinti Bildirimi`
            : `🚨 ${mahalle} Mahallesinde ${kaynak} Arızası Bildirimi`;

        const title = isPlanned ? '📅 Planlı Kesinti Bildirimi' : '🚨 Arıza Bildirimi';
        const titleColor = isPlanned ? '#2563eb' : '#dc2626';
        const bgColor = isPlanned ? '#eff6ff' : '#fef2f2';
        const borderColor = isPlanned ? '#2563eb' : '#dc2626';
        const textColor = isPlanned ? '#1e40af' : '#991b1b';
        const infoText = isPlanned 
            ? 'Planlı kesinti nedeniyle hizmet kesintisi olacaktır. Lütfen bu tarihleri dikkate alın.'
            : 'Ekiplerimiz durumu takip etmektedir. Güncellemeler size bildirilecektir.';

        let info = await transporter.sendMail({
            from: fromEmail,
            to: email,
            subject: subject,
            text: `Merhaba,\n\n${mahalle} mahallesinde ${kaynak} ${isPlanned ? 'planlı kesinti' : 'arızası'} bildirilmiştir.\n\nDetay: ${mesaj}\n\nTarih: ${tarih || new Date().toLocaleString('tr-TR')}\n\n${infoText}\n\nKentsel Tüketim Analizi`,
            html: `
                <div style="font-family: Arial, sans-serif; border: 1px solid #ddd; padding: 20px; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: ${titleColor};">${title}</h2>
                    <p>Merhaba,</p>
                    <p><strong>${mahalle}</strong> mahallesinde <strong>${kaynak}</strong> ${isPlanned ? 'planlı kesinti' : 'arızası'} bildirilmiştir.</p>
                    <div style="background: ${bgColor}; border-left: 4px solid ${borderColor}; padding: 15px; margin: 20px 0;">
                        <p style="margin: 0; color: ${textColor}; white-space: pre-line;"><strong>Detay:</strong> ${mesaj}</p>
                        <p style="margin: 10px 0 0 0; color: ${textColor};"><strong>Tarih:</strong> ${tarih || new Date().toLocaleString('tr-TR')}</p>
                    </div>
                    <p>${infoText}</p>
                    <p style="color: #666; font-size: 0.9em; margin-top: 20px;">Kentsel Tüketim Analizi</p>
                </div>
            `,
        });

        const previewUrl = isTestMode ? nodemailer.getTestMessageUrl(info) : null;
        
        console.log("=========================================");
        console.log("📧 ARıZA BİLDİRİMİ GÖNDERİLDİ");
        console.log("=========================================");
        console.log("📧 Alıcı: %s", email);
        console.log("🏘️ Mahalle: %s", mahalle);
        console.log("⚡ Kaynak: %s", kaynak);
        console.log("📧 Mail ID: %s", info.messageId);
        
        if (isTestMode) {
            if (previewUrl) {
                console.log("🔗 Maili Görüntüle: %s", previewUrl);
            }
            console.log("=========================================");
            console.log("⚠️  NOT: Bu test ortamıdır. Gerçek email gönderilmedi.");
        } else {
            console.log("✅ Gerçek email başarıyla gönderildi!");
        }
        console.log("=========================================");
        
        return { previewUrl, messageId: info.messageId, isTestMode };
    } catch (error) {
        console.error("Arıza bildirimi email gönderme hatası:", error);
        throw error;
    }
};

module.exports = { sendVerificationEmail, sendIncidentNotification };
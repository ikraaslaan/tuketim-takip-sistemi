const Incident = require('../models/Incident');
const Subscriber = require('../models/Subscriber');
const { sendIncidentNotification } = require('../services/mailService');

// Anlık Arıza Bildirimi (POST)
exports.createInstantIncident = async (req, res) => {
    try {
        const { Mahalle, Kaynak_Tipi, Aciklama } = req.body;
        if (!Mahalle || !Kaynak_Tipi) {
            return res.status(400).json({ error: 'Mahalle ve Kaynak_Tipi zorunludur' });
        }
        
        // "Doğalgaz" değerini "Dogalgaz"a çevir (enum uyumluluğu için)
        const normalizedKaynak = Kaynak_Tipi === 'Doğalgaz' ? 'Dogalgaz' : Kaynak_Tipi;
        
        const newIncident = new Incident({
            Mahalle,
            Kaynak_Tipi: normalizedKaynak,
            Tip: 'Anlık',
            Baslangic_Tarihi: new Date(),
            Durum: 'Aktif',
            Aciklama: Aciklama || 'Anlık arıza bildirimi'
        });
        
        // Önce MongoDB'ye kaydet
        const savedIncident = await newIncident.save();
        console.log(`✅ Anlık arıza MongoDB'ye kaydedildi: ${savedIncident._id}, Mahalle: ${Mahalle}, Kaynak: ${Kaynak_Tipi}`);

        // Anlık arıza bildirimi gönder - İlgili mahalledeki tüm doğrulanmış subscriber'lara
        try {
            const subscribers = await Subscriber.find({ 
                neighborhood: Mahalle,
                isVerified: true 
            });

            if (subscribers.length > 0) {
                const formattedTarih = new Date().toLocaleString('tr-TR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });

                const mesaj = Aciklama || 'Anlık arıza bildirimi';

                // Her subscriber'a email gönder
                const emailPromises = subscribers.map(subscriber => {
                    return sendIncidentNotification(subscriber.email, {
                        mahalle: Mahalle,
                        kaynak: normalizedKaynak === 'Dogalgaz' ? 'Doğalgaz' : normalizedKaynak, // Email'de Türkçe karakter kullan
                        mesaj: mesaj,
                        tarih: formattedTarih,
                        tip: 'Anlık' // Anlık arıza olduğunu belirt
                    }).catch(error => {
                        console.error(`Email gönderme hatası (${subscriber.email}):`, error);
                        return null; // Bir email başarısız olsa bile diğerlerini göndermeye devam et
                    });
                });

                await Promise.allSettled(emailPromises);
                console.log(`✅ Anlık arıza bildirimi ${subscribers.length} kullanıcıya gönderildi.`);
            } else {
                console.log(`ℹ️ ${Mahalle} mahallesinde doğrulanmış subscriber bulunamadı.`);
            }
        } catch (emailError) {
            console.error('Anlık arıza bildirimi gönderme hatası:', emailError);
            // Email hatası olsa bile arıza kaydını başarılı döndür
        }

        res.status(201).json({ success: true, data: savedIncident });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Planlı Kesinti Ekleme (POST)
exports.createPlannedIncident = async (req, res) => {
    try {
        const { Mahalle, Kaynak_Tipi, Baslangic_Tarihi, Bitis_Tarihi, Aciklama } = req.body;
        if (!Mahalle || !Kaynak_Tipi || !Baslangic_Tarihi || !Bitis_Tarihi) {
            return res.status(400).json({ error: 'Mahalle, Kaynak_Tipi, Baslangic_Tarihi ve Bitis_Tarihi zorunludur' });
        }
        
        const baslangic = new Date(Baslangic_Tarihi);
        const bitis = new Date(Bitis_Tarihi);
        
        if (bitis <= baslangic) {
            return res.status(400).json({ error: 'Bitiş tarihi başlangıç tarihinden sonra olmalıdır' });
        }
        
        // "Doğalgaz" değerini "Dogalgaz"a çevir (enum uyumluluğu için)
        const normalizedKaynak = Kaynak_Tipi === 'Doğalgaz' ? 'Dogalgaz' : Kaynak_Tipi;
        
        const newIncident = new Incident({
            Mahalle, 
            Kaynak_Tipi: normalizedKaynak, 
            Baslangic_Tarihi: baslangic, 
            Bitis_Tarihi: bitis, 
            Aciklama: Aciklama || 'Planlı kesinti',
            Tip: 'Planlı',
            Durum: 'Pasif' // Gelecek tarihli olduğu için pasif
        });
        
        // Önce MongoDB'ye kaydet
        const savedIncident = await newIncident.save();
        console.log(`✅ Planlı kesinti MongoDB'ye kaydedildi: ${savedIncident._id}, Mahalle: ${Mahalle}, Kaynak: ${Kaynak_Tipi}`);

        // Planlı kesinti bildirimi gönder - İlgili mahalledeki tüm doğrulanmış subscriber'lara
        try {
            const subscribers = await Subscriber.find({ 
                neighborhood: Mahalle,
                isVerified: true 
            });

            if (subscribers.length > 0) {
                const formattedBaslangic = baslangic.toLocaleString('tr-TR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
                const formattedBitis = bitis.toLocaleString('tr-TR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });

                const mesaj = `${Aciklama || 'Planlı kesinti'}\n\nBaşlangıç: ${formattedBaslangic}\nBitiş: ${formattedBitis}`;

                // Her subscriber'a email gönder
                const emailPromises = subscribers.map(subscriber => {
                    return sendIncidentNotification(subscriber.email, {
                        mahalle: Mahalle,
                        kaynak: normalizedKaynak === 'Dogalgaz' ? 'Doğalgaz' : normalizedKaynak, // Email'de Türkçe karakter kullan
                        mesaj: mesaj,
                        tarih: formattedBaslangic,
                        tip: 'Planlı' // Planlı kesinti olduğunu belirt
                    }).catch(error => {
                        console.error(`Email gönderme hatası (${subscriber.email}):`, error);
                        return null; // Bir email başarısız olsa bile diğerlerini göndermeye devam et
                    });
                });

                await Promise.allSettled(emailPromises);
                console.log(`✅ Planlı kesinti bildirimi ${subscribers.length} kullanıcıya gönderildi.`);
            } else {
                console.log(`ℹ️ ${Mahalle} mahallesinde doğrulanmış subscriber bulunamadı.`);
            }
        } catch (emailError) {
            console.error('Planlı kesinti bildirimi gönderme hatası:', emailError);
            // Email hatası olsa bile kesinti kaydını başarılı döndür
        }

        res.status(201).json({ success: true, data: savedIncident });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Planlı Kesintileri Listeleme (GET)
exports.getPlannedIncidents = async (req, res) => {
    try {
        // Hem 'Planlı' hem 'PLANLI' formatlarını destekle
        // Tüm planlı kesintileri getir (durum ne olursa olsun)
        const planned = await Incident.find({ 
            $or: [
                { Tip: 'Planlı' },
                { Tip: 'PLANLI' }
            ]
        }).sort({ Baslangic_Tarihi: -1 });
        res.json(planned);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Aktif Arızaları Listeleme (GET)
exports.getActiveIncidents = async (req, res) => {
    try {
        // Aktif durumda olan tüm arızaları getir (hem anlık hem planlı)
        // Hem 'Aktif' hem 'AKTIF' formatlarını destekle
        const active = await Incident.find({ 
            Durum: { $in: ['Aktif', 'AKTIF'] }
        }).sort({ Baslangic_Tarihi: -1 });
        res.json(active);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Arıza Çözme (PUT)
exports.resolveIncident = async (req, res) => {
    try {
        const { id } = req.params;
        const incident = await Incident.findByIdAndUpdate(
            id,
            { Durum: 'Pasif' }, // Çözüldü yerine Pasif olarak işaretle
            { new: true }
        );
        if (!incident) {
            return res.status(404).json({ error: 'Arıza bulunamadı' });
        }
        res.json({ success: true, data: incident });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Live Dashboard - Mahalle bazlı aktif arızalar
exports.getLiveDashboard = async (req, res) => {
    try {
        // Aktif arızaları mahalle bazında grupla
        // Hem 'Aktif'/'Pasif' hem 'AKTIF'/'PASIF' formatlarını destekle
        const incidents = await Incident.find({ 
            Durum: { $in: ['Aktif', 'Pasif', 'AKTIF', 'PASIF'] }
        }).sort({ Baslangic_Tarihi: -1 });

        // Mahalle bazında grupla
        const mahalleMap = {};
        incidents.forEach(incident => {
            const mahalle = incident.Mahalle;
            if (!mahalleMap[mahalle]) {
                mahalleMap[mahalle] = {
                    mahalle: mahalle,
                    incidents: [],
                    activeCount: 0
                };
            }
            mahalleMap[mahalle].incidents.push(incident);
            // Hem 'Aktif' hem 'AKTIF' formatlarını kontrol et
            if (incident.Durum === 'Aktif' || incident.Durum === 'AKTIF') {
                mahalleMap[mahalle].activeCount++;
            }
        });

        const result = Object.values(mahalleMap).map(item => ({
            mahalle: item.mahalle,
            activeIncidents: item.activeCount,
            totalIncidents: item.incidents.length,
            incidents: item.incidents.map(inc => ({
                id: inc._id,
                kaynak: inc.Kaynak_Tipi,
                tip: inc.Tip,
                durum: inc.Durum,
                aciklama: inc.Aciklama,
                baslangic: inc.Baslangic_Tarihi
            }))
        }));

        res.json({ success: true, data: result });
    } catch (error) {
        console.error('Live dashboard hatası:', error);
        res.status(500).json({ error: error.message });
    }
};
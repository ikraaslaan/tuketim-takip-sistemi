const Incident = require('../models/Incident');
const Subscriber = require('../models/Subscriber');
const Reading = require('../models/Reading');
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
        // 1. Tüketim verilerini çek (mahalle bazında ortalama)
        const consumptionStats = await Reading.aggregate([
            {
                $group: {
                    _id: '$Mahalle',
                    elektrikOrtalama: { $avg: '$Elektrik_Tuketim' },
                    suOrtalama: { $avg: '$Su_Tuketim' },
                    dogalgazOrtalama: { $avg: '$Dogalgaz_Tuketim' }
                }
            },
            {
                $project: {
                    _id: 0,
                    mahalle: '$_id',
                    elektrik: {
                        ortalama: { $round: ['$elektrikOrtalama', 2] }
                    },
                    su: {
                        ortalama: { $round: ['$suOrtalama', 2] }
                    },
                    dogalgaz: {
                        ortalama: { $round: ['$dogalgazOrtalama', 2] }
                    }
                }
            }
        ]);

        // 2. Aktif arızaları mahalle bazında grupla
        const incidents = await Incident.find({ 
            Durum: { $in: ['Aktif', 'Pasif', 'AKTIF', 'PASIF'] }
        }).sort({ Baslangic_Tarihi: -1 });

        // 3. Mahalle bazında arızaları grupla
        const incidentMap = {};
        incidents.forEach(incident => {
            const mahalle = incident.Mahalle;
            if (!incidentMap[mahalle]) {
                incidentMap[mahalle] = {
                    incidents: [],
                    activeCount: 0
                };
            }
            incidentMap[mahalle].incidents.push(incident);
            if (incident.Durum === 'Aktif' || incident.Durum === 'AKTIF') {
                incidentMap[mahalle].activeCount++;
            }
        });

        // 4. Tüketim verileri ile arıza verilerini birleştir
        const result = consumptionStats.map(stat => {
            const incidentData = incidentMap[stat.mahalle] || { incidents: [], activeCount: 0 };
            return {
                mahalle: stat.mahalle,
                elektrik: stat.elektrik,
                su: stat.su,
                dogalgaz: stat.dogalgaz,
                activeIncidents: incidentData.activeCount,
                totalIncidents: incidentData.incidents.length,
                incidents: incidentData.incidents.map(inc => ({
                    id: inc._id,
                    kaynak: inc.Kaynak_Tipi,
                    tip: inc.Tip,
                    durum: inc.Durum,
                    aciklama: inc.Aciklama,
                    baslangic: inc.Baslangic_Tarihi
                }))
            };
        });

        // 5. Sadece arıza olan ama tüketim verisi olmayan mahalleleri de ekle
        Object.keys(incidentMap).forEach(mahalle => {
            if (!consumptionStats.find(s => s.mahalle === mahalle)) {
                const incidentData = incidentMap[mahalle];
                result.push({
                    mahalle: mahalle,
                    elektrik: { ortalama: 0 },
                    su: { ortalama: 0 },
                    dogalgaz: { ortalama: 0 },
                    activeIncidents: incidentData.activeCount,
                    totalIncidents: incidentData.incidents.length,
                    incidents: incidentData.incidents.map(inc => ({
                        id: inc._id,
                        kaynak: inc.Kaynak_Tipi,
                        tip: inc.Tip,
                        durum: inc.Durum,
                        aciklama: inc.Aciklama,
                        baslangic: inc.Baslangic_Tarihi
                    }))
                });
            }
        });

        // 6. Mahalle adına göre sırala
        result.sort((a, b) => a.mahalle.localeCompare(b.mahalle));

        res.json({ success: true, data: result });
    } catch (error) {
        console.error('Live dashboard hatası:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};
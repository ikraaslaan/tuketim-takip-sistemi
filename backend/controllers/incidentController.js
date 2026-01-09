const Incident = require('../models/Incident');

// Anlık Arıza Bildirimi (POST)
exports.createInstantIncident = async (req, res) => {
    try {
        const { Mahalle, Kaynak_Tipi } = req.body;
        const newIncident = new Incident({
            Mahalle,
            Kaynak_Tipi,
            Tip: 'Anlık',
            Baslangic_Tarihi: new Date(),
            Durum: 'Aktif',
            Aciklama: 'Anlık arıza'
        });
        await newIncident.save();
        res.status(201).json(newIncident);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Planlı Kesinti Ekleme (POST)
exports.createPlannedIncident = async (req, res) => {
    try {
        const { Mahalle, Kaynak_Tipi, Baslangic_Tarihi, Bitis_Tarihi, Aciklama } = req.body;
        const newIncident = new Incident({
            Mahalle, Kaynak_Tipi, Baslangic_Tarihi, Bitis_Tarihi, Aciklama,
            Tip: 'Planlı',
            Durum: 'Pasif' // Gelecek tarihli olduğu için pasif
        });
        await newIncident.save();
        res.status(201).json(newIncident);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Planlı Kesintileri Listeleme (GET)
exports.getPlannedIncidents = async (req, res) => {
    try {
        const planned = await Incident.find({ Tip: 'Planlı' });
        res.json(planned);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
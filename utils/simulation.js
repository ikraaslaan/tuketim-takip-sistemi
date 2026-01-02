const Incident = require('../models/Incident');

const mahalleler = ['Cumhuriyet', 'Hürriyet', 'İstasyon', 'Fatih', 'Sanayi'];
const kaynaklar = ['Elektrik', 'Su', 'Dogalgaz'];

const generateRandomIncident = async () => {
    try {
        const rastgeleMahalle = mahalleler[Math.floor(Math.random() * mahalleler.length)];
        const rastgeleKaynak = kaynaklar[Math.floor(Math.random() * kaynaklar.length)];

        const newIncident = new Incident({
            Mahalle: rastgeleMahalle,
            Kaynak_Tipi: rastgeleKaynak,
            Aciklama: `${rastgeleMahalle} mahallesinde planlanmamış ${rastgeleKaynak} kesintisi tespit edildi.`
        });

        await newIncident.save();
        
        console.log(`⚠️  SIMULASYON: ${rastgeleMahalle} mahallesinde ${rastgeleKaynak} kesintisi olusturuldu!`);
        console.log(`📧 BILDIRIM: ${rastgeleMahalle} sakinlerine bilgilendirme mesajlari gonderildi.`);
        
        return newIncident;
    } catch (error) {
        console.error("Simülasyon hatası:", error);
    }
};

module.exports = { generateRandomIncident };
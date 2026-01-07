/**
 * Standalone script to create indexes for the Reading model (tuketim_kayitlari collection)
 * Run this script manually if you need to create indexes on an existing collection:
 * node scripts/createIndexes.js
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Reading = require('../models/Reading');

dotenv.config();

const createIndexes = async () => {
    try {
        console.log('🔄 MongoDB bağlantısı kuruluyor...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ MongoDB bağlantısı başarılı');

        const collection = Reading.collection;
        const collectionName = collection.collectionName;
        
        console.log(`\n📊 Koleksiyon: ${collectionName}`);
        console.log(`📈 Toplam doküman sayısı: ${await collection.countDocuments()}\n`);

        // 1. Tarih index (for sorting operations)
        console.log('🔄 Tarih index oluşturuluyor...');
        try {
            await collection.createIndex({ Tarih: 1 }, { 
                background: true,
                name: 'tarih_1'
            });
            console.log('✅ Tarih index başarıyla oluşturuldu');
        } catch (err) {
            if (err.code === 85) {
                console.log('ℹ️  Tarih index zaten mevcut');
            } else {
                console.error('❌ Tarih index oluşturma hatası:', err.message);
            }
        }

        // 2. Mahalle + Tarih compound index (for filtered queries with sorting)
        console.log('🔄 Mahalle + Tarih compound index oluşturuluyor...');
        try {
            await collection.createIndex({ Mahalle: 1, Tarih: 1 }, { 
                background: true,
                name: 'mahalle_1_tarih_1'
            });
            console.log('✅ Mahalle + Tarih compound index başarıyla oluşturuldu');
        } catch (err) {
            if (err.code === 85) {
                console.log('ℹ️  Mahalle + Tarih compound index zaten mevcut');
            } else {
                console.error('❌ Mahalle + Tarih compound index oluşturma hatası:', err.message);
            }
        }

        // 3. Mahalle index (for aggregation queries)
        console.log('🔄 Mahalle index oluşturuluyor...');
        try {
            await collection.createIndex({ Mahalle: 1 }, { 
                background: true,
                name: 'mahalle_1'
            });
            console.log('✅ Mahalle index başarıyla oluşturuldu');
        } catch (err) {
            if (err.code === 85) {
                console.log('ℹ️  Mahalle index zaten mevcut');
            } else {
                console.error('❌ Mahalle index oluşturma hatası:', err.message);
            }
        }

        // List all indexes
        console.log('\n📋 Mevcut indexler:');
        const indexes = await collection.indexes();
        indexes.forEach((index, idx) => {
            console.log(`   ${idx + 1}. ${index.name}: ${JSON.stringify(index.key)}`);
        });

        console.log('\n✅ Index oluşturma işlemi tamamlandı!');
        console.log('💡 Not: Index oluşturma arka planda devam edebilir. Büyük koleksiyonlarda bu işlem zaman alabilir.');

    } catch (error) {
        console.error('❌ Hata:', error.message);
        process.exit(1);
    } finally {
        await mongoose.connection.close();
        console.log('\n🔌 MongoDB bağlantısı kapatıldı');
    }
};

// Run the script
createIndexes();


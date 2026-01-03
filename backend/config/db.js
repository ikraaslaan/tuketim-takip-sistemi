const { MongoClient } = require('mongodb');

let db = null;
let client = null;

const connectDB = async () => {
    try {
        if (client) {
            return { client, db };
        }
        
        client = new MongoClient(process.env.MONGO_URI);
        await client.connect();
        db = client.db('tuketim_analizi_db');
        const host = client.options.hosts && client.options.hosts[0] ? client.options.hosts[0].host : 'MongoDB';
        console.log(`✅ MongoDB Baglandi: ${host}`);
        return { client, db };
    } catch (error) {
        console.error(`❌ MongoDB Baglanti Hatasi: ${error.message}`);
        process.exit(1);
    }
};

const getDB = () => {
    if (!db) {
        throw new Error('Database not connected. Call connectDB() first.');
    }
    return db;
};

module.exports = { connectDB, getDB };


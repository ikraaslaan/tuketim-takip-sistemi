const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL; 
// Storage işlemleri için service role key gerekli (anon key yeterli değil)
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY; 

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Supabase yapılandırması eksik!");
    console.error("Lütfen .env dosyasında şunları kontrol edin:");
    console.error("- SUPABASE_URL");
    console.error("- SUPABASE_SERVICE_ROLE_KEY veya SUPABASE_KEY");
    throw new Error("Supabase yapılandırması eksik. Lütfen .env dosyasını kontrol edin.");
}

const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

// Supabase bağlantısını test et
supabase.storage.listBuckets().then(({ data, error }) => {
    if (error) {
        console.error("⚠️ Supabase Storage bağlantı hatası:", error.message);
    } else {
        console.log("✅ Supabase Storage bağlantısı başarılı");
    }
}).catch(err => {
    console.error("⚠️ Supabase bağlantı testi hatası:", err.message);
});

module.exports = supabase;
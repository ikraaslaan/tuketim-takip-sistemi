const supabase = require('../config/supabase');

exports.listReports = async (req, res) => {
    try {
        const { data, error } = await supabase.storage
            .from('analiz-raporlari')
            .list('reports', { limit: 100, offset: 0, sortBy: { column: 'name', order: 'desc' } });

        if (error) throw error;
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
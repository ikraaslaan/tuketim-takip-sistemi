const Reading = require('../models/Reading');
const Incident = require('../models/Incident');
const Document = require('../models/Document');
const pdfService = require('../services/pdfService');
const supabaseService = require('../services/supabaseService');

// Statistical Summary - Monthly averages, peaks, lows per neighborhood
exports.getStatisticalSummary = async (req, res) => {
    try {
        const { month, year } = req.query;
        const targetMonth = month ? parseInt(month) : new Date().getMonth() + 1;
        const targetYear = year ? parseInt(year) : new Date().getFullYear();

        const startDate = new Date(targetYear, targetMonth - 1, 1);
        const endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59);

        // Previous month for comparison
        const prevMonth = targetMonth === 1 ? 12 : targetMonth - 1;
        const prevYear = targetMonth === 1 ? targetYear - 1 : targetYear;
        const prevStartDate = new Date(prevYear, prevMonth - 1, 1);
        const prevEndDate = new Date(prevYear, prevMonth, 0, 23, 59, 59);

        // Get all neighborhoods (using aggregation with allowDiskUse for large datasets)
        const neighborhoodsResult = await Reading.aggregate([
            { $group: { _id: "$Mahalle" } },
            { $project: { _id: 0, Mahalle: "$_id" } }
        ]).allowDiskUse(true);
        const neighborhoods = neighborhoodsResult.map(n => n.Mahalle);

        const summary = [];

        for (const mahalle of neighborhoods) {
            // SPEED OPTIMIZATION: $match FIRST to filter by mahalle and date before processing
            // This uses the compound index (Mahalle: 1, Tarih: -1) for maximum performance
            const currentDataResult = await Reading.aggregate([
                {
                    $match: {
                        Mahalle: mahalle,
                        Tarih: { $gte: startDate, $lte: endDate }
                    }
                }
            ]).allowDiskUse(true); // MANDATORY: Prevents 32MB sort memory limit error
            const currentData = currentDataResult;

            // Previous month data - $match FIRST for speed
            const previousDataResult = await Reading.aggregate([
                {
                    $match: {
                        Mahalle: mahalle,
                        Tarih: { $gte: prevStartDate, $lte: prevEndDate }
                    }
                }
            ]).allowDiskUse(true); // MANDATORY: Prevents 32MB sort memory limit error
            const previousData = previousDataResult;

            if (currentData.length === 0) continue;

            // Calculate statistics for each resource
            const calculateStats = (data, field) => {
                const values = data.map(r => r[field]).filter(v => v != null && v > 0);
                if (values.length === 0) return null;

                return {
                    average: values.reduce((sum, v) => sum + v, 0) / values.length,
                    peak: Math.max(...values),
                    lowest: Math.min(...values)
                };
            };

            const elektrikStats = calculateStats(currentData, 'Elektrik_Tuketim');
            const suStats = calculateStats(currentData, 'Su_Tuketim');
            const dogalgazStats = calculateStats(currentData, 'Dogalgaz_Tuketim');

            // Previous month stats for comparison
            const prevElektrikStats = calculateStats(previousData, 'Elektrik_Tuketim');
            const prevSuStats = calculateStats(previousData, 'Su_Tuketim');
            const prevDogalgazStats = calculateStats(previousData, 'Dogalgaz_Tuketim');

            const calculateChange = (current, previous) => {
                if (!current || !previous) return null;
                const change = ((current.average - previous.average) / previous.average) * 100;
                return {
                    percentage: Math.round(change * 100) / 100,
                    increased: change > 0
                };
            };

            summary.push({
                mahalle,
                elektrik: {
                    ...elektrikStats,
                    change: calculateChange(elektrikStats, prevElektrikStats)
                },
                su: {
                    ...suStats,
                    change: calculateChange(suStats, prevSuStats)
                },
                dogalgaz: {
                    ...dogalgazStats,
                    change: calculateChange(dogalgazStats, prevDogalgazStats)
                }
            });
        }

        res.status(200).json({
            success: true,
            data: summary,
            period: {
                month: targetMonth,
                year: targetYear,
                previousMonth: prevMonth,
                previousYear: prevYear
            }
        });

    } catch (error) {
        console.error("Statistical Summary Hatası:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Time Series Analysis - Seasonal trends and correlations
exports.getTimeSeriesAnalysis = async (req, res) => {
    try {
        const { year } = req.query;
        const targetYear = year ? parseInt(year) : new Date().getFullYear();

        const startDate = new Date(targetYear, 0, 1);
        const endDate = new Date(targetYear, 11, 31, 23, 59, 59);

        // SPEED OPTIMIZATION: $match FIRST to filter by date before any processing
        // This uses the Tarih index and reduces data size immediately
        const allDataResult = await Reading.aggregate([
            {
                $match: {
                    Tarih: { $gte: startDate, $lte: endDate }
                }
            },
            {
                $sort: { Tarih: 1 }
            }
        ]).allowDiskUse(true); // MANDATORY: Prevents 32MB sort memory limit error
        
        // Convert aggregation result to documents
        const allData = allDataResult;

        // Get incidents for the year (using find as incidents are typically smaller)
        const incidents = await Incident.find({
            createdAt: { $gte: startDate, $lte: endDate }
        }).lean(); // Use lean() for better performance

        // Group by season
        const seasons = {
            spring: { months: [3, 4, 5], name: 'İlkbahar' },
            summer: { months: [6, 7, 8], name: 'Yaz' },
            autumn: { months: [9, 10, 11], name: 'Sonbahar' },
            winter: { months: [12, 1, 2], name: 'Kış' }
        };

        const seasonalData = {};
        const seasonalIncidents = {};

        for (const [seasonKey, season] of Object.entries(seasons)) {
            const seasonData = allData.filter(r => {
                const month = new Date(r.Tarih).getMonth() + 1;
                return season.months.includes(month);
            });

            const seasonIncidents = incidents.filter(i => {
                const month = new Date(i.createdAt).getMonth() + 1;
                return season.months.includes(month);
            });

            // Calculate averages per resource
            const elektrikValues = seasonData.map(r => r.Elektrik_Tuketim).filter(v => v > 0);
            const suValues = seasonData.map(r => r.Su_Tuketim).filter(v => v > 0);
            const dogalgazValues = seasonData.map(r => r.Dogalgaz_Tuketim).filter(v => v > 0);

            seasonalData[seasonKey] = {
                name: season.name,
                elektrik: {
                    average: elektrikValues.length > 0 
                        ? elektrikValues.reduce((sum, v) => sum + v, 0) / elektrikValues.length 
                        : 0,
                    count: elektrikValues.length
                },
                su: {
                    average: suValues.length > 0 
                        ? suValues.reduce((sum, v) => sum + v, 0) / suValues.length 
                        : 0,
                    count: suValues.length
                },
                dogalgaz: {
                    average: dogalgazValues.length > 0 
                        ? dogalgazValues.reduce((sum, v) => sum + v, 0) / dogalgazValues.length 
                        : 0,
                    count: dogalgazValues.length
                }
            };

            seasonalIncidents[seasonKey] = {
                name: season.name,
                count: seasonIncidents.length,
                byResource: {
                    Elektrik: seasonIncidents.filter(i => i.Kaynak_Tipi === 'Elektrik').length,
                    Su: seasonIncidents.filter(i => i.Kaynak_Tipi === 'Su').length,
                    Dogalgaz: seasonIncidents.filter(i => i.Kaynak_Tipi === 'Dogalgaz' || i.Kaynak_Tipi === 'Doğalgaz').length
                }
            };
        }

        // Correlation analysis between seasons and consumption
        const correlations = [];
        const resources = ['elektrik', 'su', 'dogalgaz'];
        
        for (const resource of resources) {
            const values = Object.values(seasonalData).map(s => s[resource].average);
            const maxSeason = Object.keys(seasonalData).find(key => 
                seasonalData[key][resource].average === Math.max(...values)
            );
            const minSeason = Object.keys(seasonalData).find(key => 
                seasonalData[key][resource].average === Math.min(...values)
            );

            correlations.push({
                resource,
                peakSeason: seasonalData[maxSeason]?.name || 'N/A',
                lowestSeason: seasonalData[minSeason]?.name || 'N/A',
                peakValue: Math.max(...values),
                lowestValue: Math.min(...values)
            });
        }

        res.status(200).json({
            success: true,
            data: {
                seasonalConsumption: seasonalData,
                seasonalIncidents,
                correlations,
                year: targetYear
            }
        });

    } catch (error) {
        console.error("Time Series Analysis Hatası:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// CHUNKING HELPER: Process data in batches to prevent memory issues
// OPTIMIZED: Increased chunk size to 1000 for better performance
const processDataInChunks = async (aggregationPipeline, chunkSize = 1000) => {
    const allResults = [];
    let skip = 0;
    let hasMore = true;

    while (hasMore) {
        const chunkPipeline = [
            ...aggregationPipeline,
            { $skip: skip },
            { $limit: chunkSize }
        ];
        
        const chunk = await Reading.aggregate(chunkPipeline).allowDiskUse(true);
        
        if (chunk.length === 0) {
            hasMore = false;
        } else {
            allResults.push(...chunk);
            skip += chunkSize;
            
            // If we got less than chunkSize, we've reached the end
            if (chunk.length < chunkSize) {
                hasMore = false;
            }
        }
    }

    return allResults;
};

// Helper function to get statistical summary data with CHUNKING
const getStatisticalSummaryData = async (targetMonth, targetYear, mahalleFilter = null, resourceFilter = null) => {
    // CRITICAL FIX: Ensure month and year are integers for correct date calculation
    const monthInt = parseInt(targetMonth, 10);
    const yearInt = parseInt(targetYear, 10);
    
    // Calculate start date (first day of the month)
    const startDate = new Date(yearInt, monthInt - 1, 1);
    
    // Calculate end date (last day of the month)
    // CRITICAL: Allow incomplete months - use current date if month is not finished yet
    const now = new Date();
    const isCurrentMonth = now.getFullYear() === yearInt && now.getMonth() === (monthInt - 1);
    
    let endDate;
    if (isCurrentMonth) {
        // Current month: Use today's date (allow incomplete month data)
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        console.log(`📅 Current month detected - using today's date as endDate`);
    } else if (monthInt === 12) {
        // December: use month 11 (0-indexed) and day 31
        endDate = new Date(yearInt, 11, 31, 23, 59, 59);
    } else {
        // Other months: use next month's day 0
        endDate = new Date(yearInt, monthInt, 0, 23, 59, 59);
    }
    
    console.log(`📅 Date Range for Month ${monthInt}, Year ${yearInt}:`, {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        isCurrentMonth: isCurrentMonth
    });

    const prevMonth = targetMonth === 1 ? 12 : targetMonth - 1;
    const prevYear = targetMonth === 1 ? targetYear - 1 : targetYear;
    const prevStartDate = new Date(prevYear, prevMonth - 1, 1);
    const prevEndDate = new Date(prevYear, prevMonth, 0, 23, 59, 59);

    // SPEED OPTIMIZATION: $match FIRST - filter by specific neighborhood immediately
    // This uses the compound index (Mahalle: 1, Tarih: -1) for maximum performance
    // RELIABILITY: mahalleFilter is now always required (no "all" option)
    const summary = [];
    const mahalle = mahalleFilter; // Always a specific neighborhood

    // SPEED OPTIMIZATION: $match FIRST to filter by mahalle and date before processing
    // CHUNKING: Process data in 1000-row chunks to prevent memory issues
    // CRITICAL FIX: Case-insensitive Mahalle matching using regex
    const currentDataMatch = {
        $match: {
            Mahalle: { $regex: new RegExp(`^${mahalle}$`, 'i') }, // Case-insensitive match
            Tarih: { $gte: startDate, $lte: endDate } // Then filters by date
        }
    };
    
    const currentData = await processDataInChunks([currentDataMatch], 1000);
    console.log(`📊 Current data fetched: ${currentData.length} records for ${mahalle}`);
    if (currentData.length > 0) {
        console.log('📊 Sample current data:', JSON.stringify(currentData[0], null, 2));
    }

    const previousDataMatch = {
        $match: {
            Mahalle: { $regex: new RegExp(`^${mahalle}$`, 'i') }, // Case-insensitive match
            Tarih: { $gte: prevStartDate, $lte: prevEndDate } // Then filters by date
        }
    };
    
    const previousData = await processDataInChunks([previousDataMatch], 1000);
    console.log(`📊 Previous data fetched: ${previousData.length} records for ${mahalle}`);

    if (currentData.length > 0) {
        const calculateStats = (data, field) => {
            // DEBUG: Log field values
            const fieldValues = data.map(r => r[field]).filter(v => v != null && v > 0);
            console.log(`📊 Field ${field}: ${fieldValues.length} valid values, sample:`, fieldValues.slice(0, 5));
            
            if (fieldValues.length === 0) {
                console.log(`⚠️ No valid values found for field: ${field}`);
                return null;
            }
            
            const stats = {
                average: fieldValues.reduce((sum, v) => sum + v, 0) / fieldValues.length,
                peak: Math.max(...fieldValues),
                lowest: Math.min(...fieldValues)
            };
            
            console.log(`✅ Stats for ${field}:`, stats);
            return stats;
        };

        const elektrikStats = calculateStats(currentData, 'Elektrik_Tuketim');
        const suStats = calculateStats(currentData, 'Su_Tuketim');
        const dogalgazStats = calculateStats(currentData, 'Dogalgaz_Tuketim');

        const prevElektrikStats = calculateStats(previousData, 'Elektrik_Tuketim');
        const prevSuStats = calculateStats(previousData, 'Su_Tuketim');
        const prevDogalgazStats = calculateStats(previousData, 'Dogalgaz_Tuketim');

        const calculateChange = (current, previous) => {
            if (!current || !previous) return null;
            const change = ((current.average - previous.average) / previous.average) * 100;
            return {
                percentage: Math.round(change * 100) / 100,
                increased: change > 0
            };
        };

        // Apply resource filter if specified
        const item = {
            mahalle,
            elektrik: elektrikStats ? { ...elektrikStats, change: calculateChange(elektrikStats, prevElektrikStats) } : null,
            su: suStats ? { ...suStats, change: calculateChange(suStats, prevSuStats) } : null,
            dogalgaz: dogalgazStats ? { ...dogalgazStats, change: calculateChange(dogalgazStats, prevDogalgazStats) } : null
        };

        // If resource filter is specified, only include that resource
        if (resourceFilter && resourceFilter !== 'all') {
            const filtered = { mahalle };
            if (resourceFilter === 'elektrik' && item.elektrik) filtered.elektrik = item.elektrik;
            if (resourceFilter === 'su' && item.su) filtered.su = item.su;
            if (resourceFilter === 'dogalgaz' && item.dogalgaz) filtered.dogalgaz = item.dogalgaz;
            
            // Only add if there's data for the selected resource
            if (filtered.elektrik || filtered.su || filtered.dogalgaz) {
                summary.push(filtered);
            }
        } else {
            summary.push(item);
        }
    }

    return summary;
};

// Helper function to get time series analysis data
const getTimeSeriesAnalysisData = async (targetYear) => {
    const startDate = new Date(targetYear, 0, 1);
    const endDate = new Date(targetYear, 11, 31, 23, 59, 59);

    // SPEED OPTIMIZATION: $match FIRST to filter by date before any processing
    // This uses the Tarih index and reduces data size immediately
    const allDataResult = await Reading.aggregate([
        {
            $match: {
                Tarih: { $gte: startDate, $lte: endDate }
            }
        },
        {
            $sort: { Tarih: 1 }
        }
    ]).allowDiskUse(true); // MANDATORY: Prevents 32MB sort memory limit error
    
    // Convert aggregation result to documents
    const allData = allDataResult;

    // Get incidents for the year (using find as incidents are typically smaller)
    const incidents = await Incident.find({
        createdAt: { $gte: startDate, $lte: endDate }
    }).lean(); // Use lean() for better performance

    const seasons = {
        spring: { months: [3, 4, 5], name: 'İlkbahar' },
        summer: { months: [6, 7, 8], name: 'Yaz' },
        autumn: { months: [9, 10, 11], name: 'Sonbahar' },
        winter: { months: [12, 1, 2], name: 'Kış' }
    };

    const seasonalData = {};
    const seasonalIncidents = {};

    for (const [seasonKey, season] of Object.entries(seasons)) {
        const seasonData = allData.filter(r => {
            const month = new Date(r.Tarih).getMonth() + 1;
            return season.months.includes(month);
        });

        const seasonIncidents = incidents.filter(i => {
            const month = new Date(i.createdAt).getMonth() + 1;
            return season.months.includes(month);
        });

        const elektrikValues = seasonData.map(r => r.Elektrik_Tuketim).filter(v => v > 0);
        const suValues = seasonData.map(r => r.Su_Tuketim).filter(v => v > 0);
        const dogalgazValues = seasonData.map(r => r.Dogalgaz_Tuketim).filter(v => v > 0);

        seasonalData[seasonKey] = {
            name: season.name,
            elektrik: {
                average: elektrikValues.length > 0 ? elektrikValues.reduce((sum, v) => sum + v, 0) / elektrikValues.length : 0,
                count: elektrikValues.length
            },
            su: {
                average: suValues.length > 0 ? suValues.reduce((sum, v) => sum + v, 0) / suValues.length : 0,
                count: suValues.length
            },
            dogalgaz: {
                average: dogalgazValues.length > 0 ? dogalgazValues.reduce((sum, v) => sum + v, 0) / dogalgazValues.length : 0,
                count: dogalgazValues.length
            }
        };

        seasonalIncidents[seasonKey] = {
            name: season.name,
            count: seasonIncidents.length,
            byResource: {
                Elektrik: seasonIncidents.filter(i => i.Kaynak_Tipi === 'Elektrik').length,
                Su: seasonIncidents.filter(i => i.Kaynak_Tipi === 'Su').length,
                Dogalgaz: seasonIncidents.filter(i => i.Kaynak_Tipi === 'Dogalgaz' || i.Kaynak_Tipi === 'Doğalgaz').length
            }
        };
    }

    const correlations = [];
    const resources = ['elektrik', 'su', 'dogalgaz'];
    
    for (const resource of resources) {
        const values = Object.values(seasonalData).map(s => s[resource].average);
        const maxSeason = Object.keys(seasonalData).find(key => 
            seasonalData[key][resource].average === Math.max(...values)
        );
        const minSeason = Object.keys(seasonalData).find(key => 
            seasonalData[key][resource].average === Math.min(...values)
        );

        correlations.push({
            resource,
            peakSeason: seasonalData[maxSeason]?.name || 'N/A',
            lowestSeason: seasonalData[minSeason]?.name || 'N/A',
            peakValue: Math.max(...values),
            lowestValue: Math.min(...values)
        });
    }

    return {
        seasonalConsumption: seasonalData,
        seasonalIncidents,
        correlations,
        year: targetYear
    };
};

// Helper function to filter summary by resource
const filterSummaryByResource = (summary, resource) => {
    if (!resource || resource === 'all') return summary;
    
    return summary.map(item => {
        const filtered = { mahalle: item.mahalle };
        if (resource === 'elektrik') {
            filtered.elektrik = item.elektrik;
        } else if (resource === 'su') {
            filtered.su = item.su;
        } else if (resource === 'dogalgaz') {
            filtered.dogalgaz = item.dogalgaz;
        }
        return filtered;
    }).filter(item => {
        // Only include items that have data for the selected resource
        if (resource === 'elektrik') return item.elektrik;
        if (resource === 'su') return item.su;
        if (resource === 'dogalgaz') return item.dogalgaz;
        return true;
    });
};

// Generate and upload PDF report
exports.generateMonthlyReport = async (req, res) => {
    // Set a longer timeout for this endpoint (5 minutes)
    req.setTimeout(300000); // 5 minutes
    
    try {
        const { month, year, mahalle, resource } = req.body;
        
        // RELIABILITY: Require neighborhood selection
        if (!mahalle || mahalle === '' || mahalle === 'all') {
            return res.status(400).json({
                success: false,
                message: 'Mahalle seçimi zorunludur. Lütfen bir mahalle seçin.'
            });
        }
        
        // CRITICAL FIX: Ensure month and year are integers
        const targetMonth = month ? parseInt(month, 10) : new Date().getMonth() + 1;
        const targetYear = year ? parseInt(year, 10) : new Date().getFullYear();
        
        // Validate month range
        if (targetMonth < 1 || targetMonth > 12) {
            return res.status(400).json({
                success: false,
                message: 'Geçersiz ay değeri. Ay 1-12 arasında olmalıdır.'
            });
        }
        
        const mahalleFilter = mahalle; // Always a specific neighborhood now
        const resourceType = resource || 'all'; // Store resource type for metadata
        const resourceFilter = resource && resource !== 'all' ? resource : null;
        const isAllResources = !resourceFilter || resource === 'all';
        
        console.log(`📅 Report Parameters: Month=${targetMonth} (type: ${typeof targetMonth}), Year=${targetYear} (type: ${typeof targetYear}), Resource=${resourceType}`);

        const reportTitle = `${mahalleFilter}${resourceFilter ? ` - ${resourceFilter.toUpperCase()}` : ' - TÜM KAYNAKLAR'}`;

        console.log(`📄 PDF Rapor oluşturuluyor: ${targetYear}-${targetMonth} (${reportTitle})`);
        const startTime = Date.now();

        // RESOURCE LOGIC: Fetch data based on selection
        let sections = []; // Array format for PDF service
        
        try {
            console.log('📊 Veri çekiliyor...');
            console.log(`🔍 Mahalle Filter: "${mahalleFilter}", Month: ${targetMonth}, Year: ${targetYear}, Resource: ${resource || 'all'}`);
            
            if (resource === 'all') {
                // ALL RESOURCES: Run 3 separate aggregations
                console.log('🔄 Tüm kaynaklar için veri çekiliyor (Elektrik, Su, Doğalgaz)...');
                
                const [elektrikData, suData, dogalgazData] = await Promise.all([
                    getStatisticalSummaryData(targetMonth, targetYear, mahalleFilter, 'elektrik'),
                    getStatisticalSummaryData(targetMonth, targetYear, mahalleFilter, 'su'),
                    getStatisticalSummaryData(targetMonth, targetYear, mahalleFilter, 'dogalgaz')
                ]);
                
                console.log('📊 Fetched Data Summary:');
                console.log('  Elektrik:', elektrikData.length > 0 ? JSON.stringify(elektrikData[0], null, 2) : 'No data');
                console.log('  Su:', suData.length > 0 ? JSON.stringify(suData[0], null, 2) : 'No data');
                console.log('  Doğalgaz:', dogalgazData.length > 0 ? JSON.stringify(dogalgazData[0], null, 2) : 'No data');
                
                // Build sections array for PDF
                // CRITICAL: Always include all 3 sections, even if data is empty (for consistent PDF structure)
                // Elektrik
                if (elektrikData.length > 0 && elektrikData[0].elektrik) {
                    sections.push({
                        title: 'ELEKTRİK TÜKETİMİ',
                        color: '#10b981',
                        unit: 'kWh',
                        price: 2.5,
                        stats: elektrikData[0].elektrik
                    });
                } else {
                    // Empty template for consistent structure
                    sections.push({
                        title: 'ELEKTRİK TÜKETİMİ',
                        color: '#10b981',
                        unit: 'kWh',
                        price: 2.5,
                        stats: { average: 0, peak: 0, lowest: 0 }
                    });
                }
                
                // Su
                if (suData.length > 0 && suData[0].su) {
                    sections.push({
                        title: 'SU TÜKETİMİ',
                        color: '#3b82f6',
                        unit: 'm³',
                        price: 8,
                        stats: suData[0].su
                    });
                } else {
                    // Empty template for consistent structure
                    sections.push({
                        title: 'SU TÜKETİMİ',
                        color: '#3b82f6',
                        unit: 'm³',
                        price: 8,
                        stats: { average: 0, peak: 0, lowest: 0 }
                    });
                }
                
                // Doğalgaz
                if (dogalgazData.length > 0 && dogalgazData[0].dogalgaz) {
                    sections.push({
                        title: 'DOĞALGAZ TÜKETİMİ',
                        color: '#f97316',
                        unit: 'm³',
                        price: 12,
                        stats: dogalgazData[0].dogalgaz
                    });
                } else {
                    // Empty template for consistent structure
                    sections.push({
                        title: 'DOĞALGAZ TÜKETİMİ',
                        color: '#f97316',
                        unit: 'm³',
                        price: 12,
                        stats: { average: 0, peak: 0, lowest: 0 }
                    });
                }
                
                console.log(`✅ Tüm kaynaklar için ${sections.length} section oluşturuldu`);
            } else if (resource === 'elektrik') {
                // ELECTRIC ONLY
                console.log('🔍 Elektrik kaynağı için veri çekiliyor...');
                const elektrikData = await getStatisticalSummaryData(targetMonth, targetYear, mahalleFilter, 'elektrik');
                console.log('📊 Elektrik data:', elektrikData.length > 0 ? JSON.stringify(elektrikData[0], null, 2) : 'No data');
                
                if (elektrikData.length > 0 && elektrikData[0].elektrik) {
                    sections.push({
                        title: 'ELEKTRİK TÜKETİMİ',
                        color: '#10b981',
                        unit: 'kWh',
                        price: 2.5,
                        stats: elektrikData[0].elektrik
                    });
                }
            } else if (resource === 'su') {
                // WATER ONLY
                console.log('🔍 Su kaynağı için veri çekiliyor...');
                const suData = await getStatisticalSummaryData(targetMonth, targetYear, mahalleFilter, 'su');
                console.log('📊 Su data:', suData.length > 0 ? JSON.stringify(suData[0], null, 2) : 'No data');
                
                if (suData.length > 0 && suData[0].su) {
                    sections.push({
                        title: 'SU TÜKETİMİ',
                        color: '#3b82f6',
                        unit: 'm³',
                        price: 8,
                        stats: suData[0].su
                    });
                }
            } else if (resource === 'dogalgaz') {
                // GAS ONLY
                console.log('🔍 Doğalgaz kaynağı için veri çekiliyor...');
                const dogalgazData = await getStatisticalSummaryData(targetMonth, targetYear, mahalleFilter, 'dogalgaz');
                console.log('📊 Doğalgaz data:', dogalgazData.length > 0 ? JSON.stringify(dogalgazData[0], null, 2) : 'No data');
                
                if (dogalgazData.length > 0 && dogalgazData[0].dogalgaz) {
                    sections.push({
                        title: 'DOĞALGAZ TÜKETİMİ',
                        color: '#f97316',
                        unit: 'm³',
                        price: 12,
                        stats: dogalgazData[0].dogalgaz
                    });
                }
            }
            
            console.log(`📊 Final sections array (${sections.length} sections):`, JSON.stringify(sections.map(s => ({ title: s.title, hasStats: !!s.stats })), null, 2));
            
            const dataTime = Date.now() - startTime;
            console.log(`✅ Veri çekildi (${(dataTime/1000).toFixed(2)}s)`);
        } catch (dataError) {
            console.error("❌ Veri çekme hatası:", dataError);
            const errorMessage = dataError.message || 'Bilinmeyen hata';
            return res.status(500).json({ 
                success: false, 
                message: `Veri çekilemedi: ${errorMessage}`,
                error: process.env.NODE_ENV === 'development' ? errorMessage : undefined
            });
        }

        // Generate PDF
        let pdfBuffer;
        try {
            console.log('📝 PDF oluşturuluyor...');
            pdfBuffer = await pdfService.generateMonthlyReport({
                month: targetMonth,
                year: targetYear,
                mahalle: mahalleFilter,
                sections: sections // Pass sections array (new format)
            });
            console.log(`✅ PDF oluşturuldu: ${(pdfBuffer.length / 1024).toFixed(2)} KB`);
        } catch (pdfError) {
            console.error("PDF oluşturma hatası:", pdfError);
            return res.status(500).json({ 
                success: false, 
                message: 'PDF oluşturulamadı: ' + pdfError.message 
            });
        }

        // Upload to Supabase
        // OPTIMIZATION: URL-friendly filename (no spaces, special chars)
        // RELIABILITY: mahalleFilter is always present now (required)
        const mahalleName = mahalleFilter.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
        const resourceName = resourceFilter ? `_${resourceFilter}` : '';
        const fileName = `rapor_${targetYear}_${String(targetMonth).padStart(2, '0')}_${mahalleName}${resourceName}.pdf`;
        console.log(`☁️ Supabase'e yükleniyor: ${fileName}`);
        
        const uploadResult = await supabaseService.uploadPDF(pdfBuffer, fileName);

        if (!uploadResult.success || !uploadResult.url) {
            console.error('Supabase upload hatası:', uploadResult.error);
            return res.status(500).json({ 
                success: false, 
                message: 'PDF yüklenemedi: ' + (uploadResult.error || 'Bilinmeyen hata') 
            });
        }

        // Validate URL before storing
        if (!uploadResult.url || uploadResult.url.trim() === '' || 
            uploadResult.url === 'null' || uploadResult.url === 'undefined') {
            return res.status(500).json({ 
                success: false, 
                message: 'Geçersiz URL döndü: ' + uploadResult.url 
            });
        }

        console.log(`✅ PDF yüklendi: ${uploadResult.url}`);

        // Store metadata in Supabase
        const metadata = {
            neighborhood_name: reportTitle,
            report_date: new Date(targetYear, targetMonth - 1, 1).toISOString(),
            download_url: uploadResult.url,
            month: targetMonth,
            year: targetYear,
            resource: resourceFilter || 'all'
        };
        
        // OPTIMIZATION: Return downloadUrl immediately after upload (don't wait for metadata storage)
        const downloadUrl = uploadResult.url;
        console.log(`✅ PDF Supabase'e yüklendi: ${downloadUrl}`);

        // CRITICAL FIX: Save to MongoDB Documents collection with resourceType
        try {
            const documentRecord = new Document({
                neighborhood: mahalleFilter,
                type: 'pdf_report',
                url: downloadUrl,
                date: new Date(targetYear, targetMonth - 1, 1),
                month: targetMonth,
                year: targetYear,
                resource: resourceType, // Save resource type: 'elektrik', 'su', 'dogalgaz', or 'all'
                fileName: fileName
            });
            
            await documentRecord.save();
            console.log('✅ Document kaydedildi MongoDB\'ye:', documentRecord._id);
            console.log('   Resource Type:', resourceType);
        } catch (mongoError) {
            console.error('⚠️ MongoDB Document kaydetme hatası (PDF yüklendi):', mongoError.message);
            // Don't fail the request if MongoDB save fails
        }

        // Store metadata in Supabase asynchronously (don't block response)
        supabaseService.storePDFMetadata(metadata).then(result => {
            if (result.success) {
                console.log('✅ Supabase metadata kaydedildi');
            } else {
                console.error('⚠️ Supabase metadata kaydedilemedi (PDF yüklendi):', result.error);
            }
        }).catch(err => {
            console.error('⚠️ Supabase metadata kaydetme hatası (PDF yüklendi):', err);
        });

        // Return response immediately with downloadUrl
        const totalTime = Date.now() - startTime;
        console.log(`✅ PDF Rapor tamamlandı: ${(totalTime/1000).toFixed(2)}s`);

        res.status(200).json({
            success: true,
            data: {
                downloadUrl: downloadUrl,
                fileName: fileName,
                message: 'Rapor başarıyla oluşturuldu ve yüklendi'
            }
        });

    } catch (error) {
        console.error("PDF Rapor Oluşturma Hatası:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Delete PDF document from Supabase and MongoDB
exports.deleteDocument = async (req, res) => {
    try {
        const { id } = req.params;
        
        if (!id) {
            return res.status(400).json({
                success: false,
                message: 'Document ID is required'
            });
        }

        console.log(`🗑️ Document siliniyor: ${id}`);

        // Step 1: Find document in MongoDB to get Supabase file path
        const document = await Document.findById(id);
        
        if (!document) {
            return res.status(404).json({
                success: false,
                message: 'Document not found'
            });
        }

        // Step 2: Delete file from Supabase Storage
        if (document.fileName) {
            try {
                const deleteResult = await supabaseService.deletePDF(document.fileName);
                if (deleteResult.success) {
                    console.log('✅ Supabase dosyası silindi:', document.fileName);
                } else {
                    console.error('⚠️ Supabase dosya silme hatası:', deleteResult.error);
                    // Continue with MongoDB deletion even if Supabase deletion fails
                }
            } catch (supabaseError) {
                console.error('⚠️ Supabase silme hatası:', supabaseError.message);
                // Continue with MongoDB deletion
            }
        }

        // Step 3: Delete record from MongoDB
        await Document.findByIdAndDelete(id);
        console.log('✅ MongoDB kaydı silindi');

        // Step 4: Return success
        res.status(200).json({
            success: true,
            message: 'Document deleted successfully'
        });

    } catch (error) {
        console.error("Document silme hatası:", error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to delete document'
        });
    }
};

// Get all PDF documents - Fetch from MongoDB Documents collection
exports.getDocuments = async (req, res) => {
    try {
        // Fetch from MongoDB Documents collection
        const documents = await Document.find({})
            .sort({ createdAt: -1 })
            .limit(100)
            .lean();
        
        // Transform MongoDB documents to match frontend expectations
        const formattedDocuments = documents.map(doc => ({
            id: doc._id.toString(),
            neighborhood_name: doc.neighborhood,
            report_date: doc.date,
            download_url: doc.url,
            month: doc.month,
            year: doc.year,
            resource: doc.resource || 'all', // Resource type: 'elektrik', 'su', 'dogalgaz', or 'all'
            resourceType: doc.resource || 'all', // Alias for frontend compatibility
            created_at: doc.createdAt || doc.date
        }));
        
        // Also try to get from Supabase as fallback (merge results)
        try {
            const supabaseDocs = await supabaseService.getPDFDocuments();
            // Merge and deduplicate by URL
            const existingUrls = new Set(formattedDocuments.map(d => d.download_url));
            supabaseDocs.forEach(supabaseDoc => {
                if (!existingUrls.has(supabaseDoc.download_url)) {
                    formattedDocuments.push({
                        id: supabaseDoc.id || Date.now().toString(),
                        neighborhood_name: supabaseDoc.neighborhood_name,
                        report_date: supabaseDoc.report_date,
                        download_url: supabaseDoc.download_url,
                        month: supabaseDoc.month,
                        year: supabaseDoc.year,
                        resource: supabaseDoc.resource || 'all',
                        created_at: supabaseDoc.created_at
                    });
                }
            });
        } catch (supabaseError) {
            console.log('⚠️ Supabase fallback failed, using MongoDB only:', supabaseError.message);
        }
        
        // Sort by creation date (newest first)
        formattedDocuments.sort((a, b) => {
            const dateA = new Date(a.created_at || a.report_date);
            const dateB = new Date(b.created_at || b.report_date);
            return dateB - dateA;
        });
        
        res.status(200).json({
            success: true,
            data: formattedDocuments
        });

    } catch (error) {
        console.error("Belgeler Çekme Hatası:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};


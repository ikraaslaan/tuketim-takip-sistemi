// Supabase service for PDF storage and metadata management
// Note: This requires @supabase/supabase-js package

let supabaseClient = null;

const initializeSupabase = () => {
    if (supabaseClient) return supabaseClient;

    try {
        const { createClient } = require('@supabase/supabase-js');
        
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
        
        // SECURITY FIX: MUST use service_role key to bypass RLS for PDF uploads
        // Do NOT use anon key as it will hit RLS policy errors
        if (!supabaseServiceKey) {
            console.error('❌ SUPABASE_SERVICE_ROLE_KEY is REQUIRED for PDF uploads!');
            console.error('   The service_role key bypasses RLS policies and is necessary for backend operations.');
            console.error('   Please add SUPABASE_SERVICE_ROLE_KEY to your .env file in the backend directory.');
            return null;
        }
        
        const supabaseKey = supabaseServiceKey; // Use ONLY service role key
        console.log('✅ Using SUPABASE_SERVICE_ROLE_KEY (bypasses RLS for secure PDF uploads)');

        // Detailed logging for debugging
        console.log('🔍 Supabase Configuration Check:');
        console.log('  SUPABASE_URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
        console.log('  SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✅ Set' : '❌ Missing');
        console.log('  SUPABASE_ANON_KEY:', supabaseAnonKey ? '✅ Set' : '❌ Missing');

        if (!supabaseUrl) {
            console.error('❌ SUPABASE_URL environment variable is not set!');
            console.error('   Please add SUPABASE_URL to your .env file in the backend directory.');
            return null;
        }

        if (!supabaseKey) {
            console.error('❌ Neither SUPABASE_SERVICE_ROLE_KEY nor SUPABASE_ANON_KEY is set!');
            console.error('   Please add at least one of these to your .env file in the backend directory.');
            return null;
        }

        // Validate URL format
        try {
            new URL(supabaseUrl);
        } catch (urlError) {
            console.error('❌ SUPABASE_URL is not a valid URL:', supabaseUrl);
            return null;
        }

        supabaseClient = createClient(supabaseUrl, supabaseKey);
        console.log('✅ Supabase client initialized successfully');
        return supabaseClient;
    } catch (error) {
        console.error('❌ Supabase initialization error:', error.message);
        console.error('   Stack:', error.stack);
        return null;
    }
};

// Upload PDF to Supabase Storage
const uploadPDF = async (pdfBuffer, fileName) => {
    try {
        const client = initializeSupabase();
        if (!client) {
            return {
                success: false,
                error: 'Supabase not configured'
            };
        }

        // OPTIMIZATION: Use 'reports' bucket name (exact match for performance)
        const bucketName = process.env.SUPABASE_STORAGE_BUCKET || 'reports';
        // URL-friendly file path (no spaces, special chars)
        const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
        const filePath = `reports/${sanitizedFileName}`;

        const { data, error } = await client.storage
            .from(bucketName)
            .upload(filePath, pdfBuffer, {
                contentType: 'application/pdf',
                upsert: true
            });

        if (error) {
            console.error('Supabase upload error:', error);
            return {
                success: false,
                error: error.message
            };
        }

        // Get public URL
        const { data: urlData } = client.storage
            .from(bucketName)
            .getPublicUrl(filePath);

        // Validate URL
        const publicUrl = urlData?.publicUrl;
        if (!publicUrl || publicUrl.trim() === '' || publicUrl === 'null' || publicUrl === 'undefined') {
            console.error('Invalid public URL returned from Supabase');
            return {
                success: false,
                error: 'Invalid URL returned from storage'
            };
        }

        return {
            success: true,
            url: publicUrl,
            path: filePath
        };

    } catch (error) {
        console.error('PDF upload error:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

// Store PDF metadata in Supabase SQL table
const storePDFMetadata = async (metadata) => {
    try {
        const client = initializeSupabase();
        if (!client) {
            return {
                success: false,
                error: 'Supabase not configured'
            };
        }

        const tableName = process.env.SUPABASE_PDF_TABLE || 'pdf_reports';

        const { data, error } = await client
            .from(tableName)
            .insert([{
                neighborhood_name: metadata.neighborhood_name,
                report_date: metadata.report_date,
                download_url: metadata.download_url,
                month: metadata.month,
                year: metadata.year,
                created_at: new Date().toISOString()
            }])
            .select();

        if (error) {
            console.error('Supabase metadata insert error:', error);
            return {
                success: false,
                error: error.message
            };
        }

        return {
            success: true,
            data: data[0]
        };

    } catch (error) {
        console.error('Metadata storage error:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

// Get all PDF documents
const getPDFDocuments = async () => {
    try {
        const client = initializeSupabase();
        if (!client) {
            return [];
        }

        const tableName = process.env.SUPABASE_PDF_TABLE || 'pdf_reports';

        const { data, error } = await client
            .from(tableName)
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Supabase query error:', error);
            return [];
        }

        // Filter out documents with invalid URLs
        const validDocuments = (data || []).filter(doc => 
            doc.download_url && 
            doc.download_url.trim() !== '' && 
            doc.download_url !== 'null' &&
            doc.download_url !== 'undefined' &&
            (doc.download_url.startsWith('http://') || doc.download_url.startsWith('https://'))
        );
        
        return validDocuments;

    } catch (error) {
        console.error('Get documents error:', error);
        return [];
    }
};

// Delete PDF from Supabase Storage
const deletePDF = async (fileName) => {
    try {
        const client = initializeSupabase();
        if (!client) {
            return {
                success: false,
                error: 'Supabase not configured'
            };
        }

        const bucketName = process.env.SUPABASE_STORAGE_BUCKET || 'reports';
        const filePath = `reports/${fileName}`;

        const { error } = await client.storage
            .from(bucketName)
            .remove([filePath]);

        if (error) {
            console.error('Supabase delete error:', error);
            return {
                success: false,
                error: error.message
            };
        }

        return {
            success: true,
            message: 'File deleted successfully'
        };

    } catch (error) {
        console.error('PDF delete error:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

module.exports = {
    uploadPDF,
    storePDFMetadata,
    getPDFDocuments,
    deletePDF,
    initializeSupabase // Export for direct access if needed
};


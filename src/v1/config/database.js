const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL?.trim();
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

const hasValidConnection = supabaseUrl && supabaseKey;

let supabase = null;

if (hasValidConnection) {
    supabase = createClient(supabaseUrl, supabaseKey, {
        auth: {
        autoRefreshToken: false,
        persistSession: false
        }
    });
}

const healthCheck = async () => {
    if (!supabase) {
        return null;
    }
    
    try {
        const { error } = await supabase
        .from('users')
        .select('id', { count: 'exact', head: true });
        
        return error === null;
    } catch (error) {
        console.error('Supabase health check failed:', error.message);
        return false;
    }
};

const dbProxy = supabase || {
    from: () => ({
        select: async () => { throw new Error('Supabase not configured'); },
        insert: async () => { throw new Error('Supabase not configured'); },
        update: async () => { throw new Error('Supabase not configured'); },
        delete: async () => { throw new Error('Supabase not configured'); }
    })
};

dbProxy.healthCheck = healthCheck;

module.exports = dbProxy;

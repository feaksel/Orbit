
import fs from 'fs';
import path from 'path';
import { createClient } from 'redis';

export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );
    
    // Disable Caching - CRITICAL for live sync
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // Safe Parse Body
    let body = req.body;
    if (req.method === 'POST' && typeof body === 'string') {
        try { body = JSON.parse(body); } catch (e) { console.error("Body parse failed", e); }
    }

    // 1. Try Native Redis Client (Preferred if 'redis' is installed and URL exists)
    // This supports 'redis-orange-queen' and other direct integrations.
    const redisUrl = process.env.KV_URL || process.env.REDIS_URL;
    
    if (redisUrl) {
        try {
            const client = createClient({ url: redisUrl });
            client.on('error', err => console.error('Redis Client Error', err));
            
            await client.connect();

            // Handle GET or POST "fetch_latest" (Legacy Support for cached clients)
            if (req.method === 'GET' || (req.method === 'POST' && body && body.action === 'fetch_latest')) {
                const value = await client.get('orbit_data');
                await client.disconnect();
                return res.status(200).json(value ? JSON.parse(value) : null);
            }

            if (req.method === 'POST') {
                // Store as a stringified JSON blob
                await client.set('orbit_data', JSON.stringify(body));
                await client.disconnect();
                return res.status(200).json({ success: true, source: 'redis' });
            }
        } catch (error) {
            console.error('Redis Connection Error:', error);
            // Do not return here, let it fall through to try REST or Local as backup
            // unless it was a hard failure
            if (!process.env.KV_REST_API_URL) {
                 return res.status(500).json({ error: 'Redis Error', details: error.message });
            }
        }
    }

    // 2. Try Vercel KV REST API (Alternative)
    const hasKVRest = !!process.env.KV_REST_API_URL;
    if (hasKVRest) {
        try {
            const kvBaseUrl = process.env.KV_REST_API_URL.replace(/\/$/, '');
            const kvToken = process.env.KV_REST_API_TOKEN;

            if (req.method === 'GET' || (req.method === 'POST' && body && body.action === 'fetch_latest')) {
                const response = await fetch(`${kvBaseUrl}/get/orbit_data`, {
                    method: 'GET',
                    headers: { Authorization: `Bearer ${kvToken}` },
                    cache: 'no-store'
                });

                if (!response.ok) throw new Error(response.statusText);
                const json = await response.json();
                const result = json.result;
                
                return res.status(200).json(typeof result === 'string' ? JSON.parse(result) : (result || null));
            }

            if (req.method === 'POST') {
                const response = await fetch(`${kvBaseUrl}/set/orbit_data`, {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${kvToken}` },
                    body: JSON.stringify(body),
                    cache: 'no-store'
                });

                if (!response.ok) throw new Error(response.statusText);
                return res.status(200).json({ success: true, source: 'kv-rest' });
            }
        } catch (error) {
            console.error('KV REST Error:', error);
            return res.status(500).json({ error: 'Cloud Storage Failed', details: error.message });
        }
    }

    // 3. Fallback: Local File System (Only for local dev)
    const isVercel = process.env.VERCEL === '1';
    
    // If running on Vercel but no DB configured, we must fail loudly
    if (isVercel && req.method === 'POST') {
        return res.status(500).json({ 
            error: "Database Not Configured", 
            message: "Vercel detected but no Redis/KV URL found. Please link a database." 
        });
    }

    // Local Development File Handler
    const LOCAL_DB_FILE = path.join(process.cwd(), 'orbit_database.json');
    try {
        if (req.method === 'GET' || (req.method === 'POST' && body && body.action === 'fetch_latest')) {
            if (fs.existsSync(LOCAL_DB_FILE)) {
                const data = fs.readFileSync(LOCAL_DB_FILE, 'utf-8');
                return res.status(200).json(JSON.parse(data));
            }
            return res.status(200).json(null);
        }

        if (req.method === 'POST') {
            fs.writeFileSync(LOCAL_DB_FILE, JSON.stringify(body, null, 2));
            return res.status(200).json({ success: true, source: 'local-file' });
        }
    } catch (error) {
        console.error('Local Persistence Error:', error);
        return res.status(500).json({ error: 'Local Storage Failed', details: error.message });
    }
}

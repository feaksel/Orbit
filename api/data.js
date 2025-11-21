
import fs from 'fs';
import path from 'path';

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

    // 1. Environment Detection
    const isVercel = process.env.VERCEL === '1';
    const hasKV = !!process.env.KV_REST_API_URL;

    // 2. Cloud Storage (Vercel KV / Redis)
    if (hasKV) {
        try {
            // Remove trailing slash if present to avoid double slashes
            const kvBaseUrl = process.env.KV_REST_API_URL.replace(/\/$/, '');
            const kvToken = process.env.KV_REST_API_TOKEN;

            if (req.method === 'GET') {
                // Use the explicit GET endpoint: /get/key
                const response = await fetch(`${kvBaseUrl}/get/orbit_data`, {
                    method: 'GET', // Vercel/Upstash GET endpoint is a GET request
                    headers: { Authorization: `Bearer ${kvToken}` },
                    cache: 'no-store'
                });

                if (!response.ok) {
                    const errText = await response.text();
                    console.error(`KV Read Error (${response.status}):`, errText);
                    throw new Error(`KV Read Error: ${response.statusText}`);
                }
                
                const json = await response.json();
                // Upstash/KV returns { result: "stringified_json" } or { result: null }
                const result = json.result;

                if (!result) return res.status(200).json(null);
                
                // If stored as a string, parse it. If stored as JSON object, use as is.
                return res.status(200).json(typeof result === 'string' ? JSON.parse(result) : result);
            }

            if (req.method === 'POST') {
                // Use the explicit SET endpoint: /set/key (body is value)
                // Note: For complex JSON objects, stringifying them is safest to preserve structure
                const response = await fetch(`${kvBaseUrl}/set/orbit_data`, {
                    method: 'POST',
                    headers: { 
                        Authorization: `Bearer ${kvToken}`,
                        // Upstash expects raw body or text for simple set, but for json we can pass directly
                    },
                    body: JSON.stringify(req.body),
                    cache: 'no-store'
                });

                if (!response.ok) {
                    const errText = await response.text();
                    console.error(`KV Write Error (${response.status}):`, errText);
                    throw new Error(`KV Write Error: ${response.statusText}`);
                }
                
                return res.status(200).json({ success: true, source: 'cloud' });
            }
        } catch (error) {
            console.error('Cloud Persistence Error:', error);
            // Return 500 so client knows sync failed and can show error status
            return res.status(500).json({ error: 'Cloud Storage Failed', details: error.message });
        }
    }

    // 3. Fallback: Local File System (Only for local dev)
    // If running on Vercel WITHOUT KV, this is where data gets lost.
    // We return an error on Vercel to warn the user.
    if (isVercel && req.method === 'POST') {
        return res.status(500).json({ 
            error: "Database Not Configured", 
            message: "Orbit is running on Vercel but Vercel KV is not linked. Data will not persist. Please link a KV store in Vercel Dashboard." 
        });
    }

    // Local Development Handler
    const LOCAL_DB_FILE = path.join(process.cwd(), 'orbit_database.json');

    try {
        if (req.method === 'GET') {
            if (fs.existsSync(LOCAL_DB_FILE)) {
                const data = fs.readFileSync(LOCAL_DB_FILE, 'utf-8');
                return res.status(200).json(JSON.parse(data));
            }
            return res.status(200).json(null);
        }

        if (req.method === 'POST') {
            fs.writeFileSync(LOCAL_DB_FILE, JSON.stringify(req.body, null, 2));
            return res.status(200).json({ success: true, source: 'local' });
        }
    } catch (error) {
        console.error('Local Persistence Error:', error);
        return res.status(500).json({ error: 'Local Storage Failed', details: error.message });
    }
}

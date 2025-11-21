
import fs from 'fs';
import path from 'path';

// Helper to interact with Vercel KV (Redis) via REST API
// We use fetch to avoid needing to install @vercel/kv dependency for the user
async function kvCommand(command, args) {
    const url = process.env.KV_REST_API_URL;
    const token = process.env.KV_REST_API_TOKEN;

    if (!url || !token) {
        throw new Error('Vercel KV not configured');
    }

    const response = await fetch(`${url}/${command}/${args.join('/')}`, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    if (!response.ok) {
        throw new Error(`KV Error: ${response.statusText}`);
    }

    const json = await response.json();
    return json.result;
}

// Local File Fallback (For when running node server.js locally)
const LOCAL_DB_FILE = path.join(process.cwd(), 'orbit_database.json');

export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    try {
        // STRATEGY 1: Vercel KV (Cloud Persistence)
        if (process.env.KV_REST_API_URL) {
            if (req.method === 'GET') {
                const data = await kvCommand('get', ['orbit_data']);
                // Redis stores strings, so we might need to parse it, or it might be null
                return res.status(200).json(typeof data === 'string' ? JSON.parse(data) : data || null);
            } 
            
            if (req.method === 'POST') {
                // Store as string
                await fetch(`${process.env.KV_REST_API_URL}/set/orbit_data`, {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(req.body)
                });
                return res.status(200).json({ success: true, source: 'cloud' });
            }
        }

        // STRATEGY 2: Local File System (Local Development)
        // This works when running 'node server.js', but NOT on Vercel Serverless
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
        console.error('Persistence Error:', error);
        // Fallback: If cloud fails, we return error so frontend keeps using local storage
        return res.status(500).json({ error: 'Persistence failed', details: error.message });
    }
}

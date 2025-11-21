
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import handler from './api/data.js';

const app = express();
const PORT = 3001;

app.use(express.json({ limit: '50mb' }));

// Allow CORS
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    next();
});

// Proxy requests to the Vercel-style handler
app.all('/api/data', (req, res) => {
    handler(req, res);
});

app.listen(PORT, () => {
    console.log(`\n🚀 Orbit Local Server running at http://localhost:${PORT}`);
    console.log(`💾 Data saved locally to orbit_database.json`);
    console.log(`☁️  To enable Cloud Sync on Vercel, add KV_REST_API_URL env var.\n`);
});

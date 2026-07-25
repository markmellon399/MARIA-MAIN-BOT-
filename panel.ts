/**
 * MARIA-MM MULTI-USER HOSTING PANEL
 */
import os from 'os';
import express, { Request, Response } from 'express';
import { makeWASocket, useMultiFileAuthState, Browsers, fetchLatestBaileysVersion, WASocket } from '@whiskeysockets/baileys';
import pino from 'pino';
import path from 'path';
import fs from 'fs';
import { loadBotLogic } from './botLoader';

const app = express();
const PORT = process.env.PORT || 7700;
const logger = pino({ level: 'silent' });

app.use(express.json());
app.use(express.static(path.join(__dirname, 'panel-site')));

// ============================================
// THE MULTI-SESSION MANAGER
// ============================================
const activeBots = new Map<string, WASocket>(); // Holds all active bots in memory

async function startUserBot(sessionId: string, res: Response) {
    if (activeBots.has(sessionId)) {
        return res.status(400).json({ error: 'Bot is already running for this session!' });
    }

    const userFolder = path.join(__dirname, `user_sessions/${sessionId}`);
    if (!fs.existsSync(userFolder)) fs.mkdirSync(userFolder, { recursive: true });

    try {
        // 1. Decode the Session ID and write it to the folder
        const credsPath = path.join(userFolder, 'creds.json');
        if (!fs.existsSync(credsPath)) {
            // The Session ID is a base64 string. We decode it and save it as creds.json
            fs.writeFileSync(credsPath, Buffer.from(sessionId, 'base64').toString('utf-8'));
            console.log(`[Panel] Decoded Session ID and saved creds.json for ${sessionId.substring(0, 10)}...`);
        }

        // 2. Initialize Auth State
        const { state, saveCreds } = await useMultiFileAuthState(userFolder);
        const { version } = await fetchLatestBaileysVersion();

        // 3. Create a new socket SPECIFICALLY for this user
        const sock = makeWASocket({
            version,
            auth: state,
            logger,
            browser: Browsers.ubuntu('MARIA-MM'),
            syncFullHistory: false,
        });

        // 4. Save credentials when they update
        sock.ev.on('creds.update', saveCreds);

        // 5. Handle connection updates for THIS specific bot
        sock.ev.on('connection.update', (update) => {
            const { connection, lastDisconnect } = update;
            if (connection === 'open') {
                console.log(`[Panel] Bot ${sessionId.substring(0, 10)}... connected successfully!`);
            }
            if (connection === 'close') {
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                console.log(`[Panel] Bot ${sessionId.substring(0, 10)}... disconnected. Code: ${statusCode}`);
                activeBots.delete(sessionId); // Remove from memory if it closes
            }
        });

        // 6. Save the socket to our active list
        activeBots.set(sessionId, sock);

        // 7. Load the main bot logic (plugins, menu, etc.) for THIS user!
        await loadBotLogic(sock, sessionId);

        res.json({ success: true, message: 'Bot is starting and logging in...' });

    } catch (err) {
        console.error(`[Panel] Failed to start bot ${sessionId}:`, err);
        res.status(500).json({ error: 'Failed to start bot. Invalid Session ID.' });
    }
}

// ============================================
// API ENDPOINTS
// ============================================
app.get('/api/bots', (req: Request, res: Response) => {
    // Returns a list of all currently running bots
    const bots = Array.from(activeBots.keys()).map(id => ({ id: id.substring(0, 10) + '...', status: 'online' }));
    
    // Calculate REAL Server RAM Usage
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const ramPercentage = Math.round((usedMem / totalMem) * 100);
    
    // Calculate REAL Server CPU Usage (1-minute load average)
    // os.loadavg()[0] gives the average system load over the last 1 minute.
    // We divide it by the number of CPU cores and multiply by 100 to get a percentage.
    const cpuLoad = os.loadavg()[0];
    const cpuCores = os.cpus().length;
    const cpuPercentage = Math.min(Math.round((cpuLoad / cpuCores) * 100), 100);
    
    res.json({
        total: bots.length,
        bots,
        ram: ramPercentage,
        cpu: cpuPercentage
    });
});

// ============================================
// START SERVER
// ============================================
app.listen(PORT, () => {
    console.log('');
    console.log('╔════════════════════════════════════════════╗');
    console.log('║                                            ║');
    console.log('║  🚀 MARIA-MM MULTI-USER HOSTING PANEL      ║');
    console.log('║                                            ║');
    console.log(`║  🌐 Listening on port ${PORT}             ║`);
    console.log('║  ✅ Status: ONLINE                         ║');
    console.log('║                                            ║');
    console.log('╚════════════════════════════════════════════╝');
    console.log('');
});
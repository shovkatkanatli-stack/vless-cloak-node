const http = require('http');
const net = require('net');
const { WebSocketServer } = require('ws');

// UUID: 978d7db0-d561-435a-91a9-911092afafad
const USER_ID = (process.env.UUID || '978d7db0-d561-435a-91a9-911092afafad').replaceAll('-', '').toLowerCase();
const PORT = process.env.PORT || process.env.SERVER_PORT || 8080;

// High-Fidelity Active Cloaking Pages (Matching X-VPN Discoveries)
const PLAYER_HTML = `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>پخش زنده شبکه سه و آپارات اسپرت - تلوبیون</title>
    <style>
        body { margin: 0; padding: 0; background-color: #0b0e14; color: #ffffff; font-family: Tahoma, 'Shabnam', sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; text-align: center; }
        .player-card { background: #151a24; border: 1px solid #232c3d; border-radius: 14px; padding: 24px; max-width: 680px; width: 90%; box-shadow: 0 12px 40px rgba(0,0,0,0.5); }
        .video-box { width: 100%; height: 340px; background: #000; border-radius: 10px; display: flex; align-items: center; justify-content: center; position: relative; overflow: hidden; border: 1px solid #2d3748; }
        .live-badge { position: absolute; top: 14px; right: 14px; background: #e50914; color: #fff; padding: 5px 12px; border-radius: 6px; font-size: 13px; font-weight: bold; letter-spacing: 0.5px; }
        .play-btn { width: 72px; height: 72px; border-radius: 50%; background: rgba(229,9,20,0.85); border: 3px solid #fff; display: flex; align-items: center; justify-content: center; cursor: pointer; }
        .play-btn:after { content: ''; display: block; width: 0; height: 0; border-top: 12px solid transparent; border-bottom: 12px solid transparent; border-left: 22px solid #fff; margin-left: 6px; }
        h1 { font-size: 20px; margin-top: 18px; color: #38bdf8; }
        p { font-size: 14px; color: #94a3b8; line-height: 1.8; margin: 10px 0; }
        .status { display: flex; justify-content: space-between; font-size: 13px; color: #64748b; border-top: 1px solid #232c3d; padding-top: 14px; margin-top: 18px; }
        .tag { background: #1e293b; color: #38bdf8; padding: 3px 8px; border-radius: 4px; font-size: 12px; }
    </style>
</head>
<body>
    <div class="player-card">
        <div class="video-box">
            <div class="live-badge">پخش زنده شبکه سه (HLS FHD)</div>
            <div class="play-btn"></div>
        </div>
        <h1>سرور شتاب‌نگار CDN و استریم چندرسانه‌ای ملی</h1>
        <p>ترافیک این مدیاسرور به صورت مستقیم از طریق شبکه شتاب‌نگار داخلی و CDN استانی بهینه‌سازی شده است.</p>
        <div class="status">
            <span>وضعیت استریم: <strong style="color: #4ade80;">برخط (Online)</strong></span>
            <span>کیفیت: <span class="tag">1080p 60fps</span></span>
            <span>زیرساخت: <span class="tag">Aparat / Telewebion CDN Relay</span></span>
        </div>
    </div>
</body>
</html>`;

const BANK_HTML = `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
    <meta charset="UTF-8">
    <title>سامانه بانکداری الکترونیک - بانک سامان / آبانک</title>
    <style>
        body { margin: 0; padding: 0; background-color: #f1f5f9; color: #1e293b; font-family: Tahoma, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
        .box { background: #ffffff; border: 1px solid #cbd5e1; border-radius: 12px; padding: 32px; max-width: 480px; width: 90%; box-shadow: 0 4px 20px rgba(0,0,0,0.06); text-align: center; }
        .logo { font-size: 24px; font-weight: bold; color: #0284c7; margin-bottom: 12px; }
        .desc { font-size: 14px; color: #64748b; line-height: 1.8; margin-bottom: 24px; }
        .badge { background: #e0f2fe; color: #0369a1; padding: 6px 12px; border-radius: 6px; font-size: 13px; font-weight: bold; display: inline-block; }
    </style>
</head>
<body>
    <div class="box">
        <div class="logo">سامانه متمرکز خدمات امن بانکی</div>
        <div class="badge">درگاه امن شاپرک و سوئیچ ملی شتاب</div>
        <p class="desc">این پروتکل ارتباطی با گواهی رمزنگاری امن اختصاصی جهت تضمین تراکنش‌های بانکی فعال است.</p>
        <div style="font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 12px;">وضعیت: اتصال ایمن (SSL Verified) | شناسه ترمینال: SB24-ABANK-EDGE</div>
    </div>
</body>
</html>`;

// Dummy Bank PDF Payload (Valid PDF-1.4 format)
const DUMMY_PDF = Buffer.from(
    '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000052 00000 n\n0000000101 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n178\n%%EOF\n'
);

// HTTP Server: Handles Cloaking for Active Probing
const httpServer = http.createServer((req, res) => {
    const url = req.url || '/';

    // 1. Video Streaming Camouflage (.m3u8, .ts, /watch, /stream)
    if (url.includes('.m3u8') || url.includes('/stream') || url.includes('/watch')) {
        res.writeHead(200, {
            'Content-Type': 'application/vnd.apple.mpegurl',
            'Access-Control-Allow-Origin': '*',
            'Server': 'nginx/1.24.0',
            'X-Powered-By': 'Aparat-Telewebion-Edge',
            'Cache-Control': 'no-cache, no-store'
        });
        res.end(
            '#EXTM3U\n' +
            '#EXT-X-VERSION:3\n' +
            '#EXT-X-TARGETDURATION:10\n' +
            '#EXT-X-MEDIA-SEQUENCE:0\n' +
            '#EXTINF:10.0,\nsegment0.ts\n' +
            '#EXTINF:10.0,\nsegment1.ts\n' +
            '#EXT-X-ENDLIST'
        );
        return;
    }

    // 2. Bank Document / PDF Download Camouflage (.pdf, /statement, /reports)
    if (url.includes('.pdf') || url.includes('/statement') || url.includes('/reports')) {
        res.writeHead(200, {
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'inline; filename="statement.pdf"',
            'Server': 'nginx/1.24.0',
            'X-Powered-By': 'SamanBank-Reporting-Service',
            'Cache-Control': 'private, max-age=300'
        });
        res.end(DUMMY_PDF);
        return;
    }

    // 3. Bank & Government Services Portal Camouflage (/bank, /saman, /ibank, /gov, /khamenei)
    if (url.includes('/bank') || url.includes('/saman') || url.includes('/ibank') || url.includes('/gov') || url.includes('/khamenei') || url.includes('/abank')) {
        res.writeHead(200, {
            'Content-Type': 'text/html; charset=utf-8',
            'Server': 'Apache/2.4.52 (Ubuntu)',
            'X-Powered-By': 'SamanBank-Gov-Portal',
            'Cache-Control': 'public, max-age=3600'
        });
        res.end(BANK_HTML);
        return;
    }

    // 4. Fallback Root Camouflage (Persian Live Sports TV Player)
    res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Server': 'nginx/1.24.0',
        'X-Powered-By': 'Telewebion-Aparat-CDN',
        'Cache-Control': 'public, max-age=3600'
    });
    res.end(PLAYER_HTML);
});

// WebSocket Server: Multi-Path VLESS Proxy
const wss = new WebSocketServer({ server: httpServer });

wss.on('connection', (ws, req) => {
    let targetSocket = null;
    let isHeaderProcessed = false;
    let earlyDataBuffer = Buffer.alloc(0);

    ws.on('message', (chunk) => {
        if (!Buffer.isBuffer(chunk)) {
            chunk = Buffer.from(chunk);
        }

        if (!isHeaderProcessed) {
            if (chunk.length < 18) {
                ws.close();
                return;
            }

            const version = chunk[0];
            const clientUUID = chunk.subarray(1, 17).toString('hex').toLowerCase();
            if (clientUUID !== USER_ID) {
                ws.close();
                return;
            }

            const optLength = chunk[17];
            let offset = 18 + optLength;

            if (chunk.length < offset + 4) {
                ws.close();
                return;
            }

            const command = chunk[offset]; // 1 = TCP
            offset += 1;

            const port = chunk.readUInt16BE(offset);
            offset += 2;

            const addrType = chunk[offset];
            offset += 1;

            let targetHost = '';
            if (addrType === 1) { // IPv4
                targetHost = chunk.subarray(offset, offset + 4).join('.');
                offset += 4;
            } else if (addrType === 2) { // Domain
                const domainLen = chunk[offset];
                offset += 1;
                targetHost = chunk.subarray(offset, offset + domainLen).toString('utf-8');
                offset += domainLen;
            } else if (addrType === 3) { // IPv6
                const ipv6Parts = [];
                for (let i = 0; i < 16; i += 2) {
                    ipv6Parts.push(chunk.readUInt16BE(offset + i).toString(16));
                }
                targetHost = ipv6Parts.join(':');
                offset += 16;
            } else {
                ws.close();
                return;
            }

            isHeaderProcessed = true;
            const remainingPayload = chunk.subarray(offset);

            // Establish connection to destination (bypassing DNS poisoning)
            targetSocket = net.connect({ host: targetHost, port: port }, () => {
                // Send VLESS response header (version 0, opt 0)
                if (ws.readyState === ws.OPEN) {
                    ws.send(Buffer.from([version, 0]));
                }

                // Send remaining payload if any
                if (remainingPayload.length > 0) {
                    targetSocket.write(remainingPayload);
                }

                // Flush early data arrived while connecting
                if (earlyDataBuffer.length > 0) {
                    targetSocket.write(earlyDataBuffer);
                    earlyDataBuffer = Buffer.alloc(0);
                }
            });

            targetSocket.on('data', (data) => {
                if (ws.readyState === ws.OPEN) {
                    ws.send(data);
                }
            });

            targetSocket.on('error', (err) => {
                ws.close();
            });

            targetSocket.on('close', () => {
                ws.close();
            });

        } else {
            // Header is processed, stream user data directly to target
            if (targetSocket && !targetSocket.connecting && !targetSocket.destroyed) {
                targetSocket.write(chunk);
            } else if (targetSocket && targetSocket.connecting) {
                earlyDataBuffer = Buffer.concat([earlyDataBuffer, chunk]);
            }
        }
    });

    ws.on('close', () => {
        if (targetSocket) {
            targetSocket.destroy();
        }
    });

    ws.on('error', () => {
        if (targetSocket) {
            targetSocket.destroy();
        }
    });
});

httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Botkeep Comprehensive Anti-DPI Suite running on 0.0.0.0:${PORT}`);
    console.log(`Configured UUID: ${USER_ID}`);
});

const http = require('http');
const https = require('https');
const fs = require('fs').promises;
const path = require('path');

// TODO: Replace 'PASTE_YOUR_API_KEY_HERE' with your actual Google AI API key.
// For better security, consider loading this from an environment variable.
const API_KEY = 'AIzaSyB4d_8RVG98SSmRoLOfrBNUDrKQYfZcpnU';

const DB_PATH = path.join(__dirname, 'db.json');

const server = http.createServer(async (req, res) => {
    const { method, url } = req;

    if (url === '/generate' && method === 'POST') {
        if (API_KEY === 'PASTE_YOUR_API_KEY_HERE') {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: 'API key is not set. Please replace "PASTE_YOUR_API_KEY_HERE" in server.js with your actual Google AI API key.' }));
            return;
        }

        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            try {
                const { prompt } = JSON.parse(body);
                if (!prompt) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ message: 'Prompt is required' }));
                    return;
                }
                const externalApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;
                const externalApiReq = https.request(externalApiUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }, (externalApiRes) => {
                    let externalApiBody = '';
                    externalApiRes.on('data', (chunk) => {
                        externalApiBody += chunk;
                    });
                    externalApiRes.on('end', () => {
                        if (externalApiRes.statusCode >= 400) {
                            console.error('Error from external API:', externalApiBody);
                            try {
                                const errorResponse = JSON.parse(externalApiBody);
                                res.writeHead(externalApiRes.statusCode, { 'Content-Type': 'application/json' });
                                res.end(JSON.stringify({ message: 'Error from external API.', error: errorResponse }));
                            } catch (e) {
                                res.writeHead(externalApiRes.statusCode, { 'Content-Type': 'text/plain' });
                                res.end(externalApiBody);
                            }
                        } else {
                            res.writeHead(externalApiRes.statusCode, externalApiRes.headers);
                            res.end(externalApiBody);
                        }
                    });
                });

                externalApiReq.on('error', (e) => {
                    console.error('Problem with request to external API. This could be due to an invalid API key or a network issue. Please check your API key and network connection. Error:', e.message);
                    res.writeHead(500);
                    res.end(JSON.stringify({ message: 'Error calling external API' }));
                });

                externalApiReq.write(JSON.stringify({
                    "contents": [{
                        "parts": [{
                            "text": prompt
                        }]
                    }]
                }));
                externalApiReq.end();

            } catch (e) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'Invalid JSON in request body' }));
            }
        });
        return;
    }
    
    // API routes
    if (url.startsWith('/api/logs')) {
        res.setHeader('Content-Type', 'application/json');
        try {
            const db = JSON.parse(await fs.readFile(DB_PATH, 'utf8'));

            if (method === 'GET') {
                res.writeHead(200);
                res.end(JSON.stringify(db.logs));
            } else if (method === 'POST') {
                let body = '';
                req.on('data', chunk => body += chunk.toString());
                req.on('end', async () => {
                    try {
                        const newLog = JSON.parse(body);
                        newLog.id = Date.now().toString(); // Simple unique ID
                        newLog.timestamp = new Date().toISOString();
                        db.logs.push(newLog);
                        await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2));
                        res.writeHead(201);
                        res.end(JSON.stringify(newLog));
                    } catch (e) {
                        res.writeHead(500);
                        res.end(JSON.stringify({ message: 'Error writing to database', error: e.message }));
                    }
                });
            } else {
                res.writeHead(405);
                res.end(JSON.stringify({ message: 'Method Not Allowed' }));
            }
        } catch (e) {
            res.writeHead(500);
            res.end(JSON.stringify({ message: 'Database read error', error: e.message }));
        }
        return;
    }

    // Static file serving
    try {
        let filePath = url === '/' ? '/index.html' : url;
        const extname = path.extname(filePath);
        let contentType = 'text/html';
        switch (extname) {
            case '.js':
                contentType = 'text/javascript';
                break;
            case '.css':
                contentType = 'text/css';
                break;
            case '.json':
                contentType = 'application/json';
                break;
        }

        const content = await fs.readFile(path.join(__dirname, filePath));
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content, 'utf-8');
    } catch (error) {
        if (error.code == 'ENOENT') {
            res.writeHead(404);
            res.end('File not found!');
        } else {
            res.writeHead(500);
            res.end('Sorry, check with the site admin for error: '+error.code+' ..\n');
        }
    }
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
    console.log('To run the app, open your browser to this address.');
});

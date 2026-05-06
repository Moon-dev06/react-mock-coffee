require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();
const axios = require('axios');

// app.use(cors());
app.use(cors({
  origin: '*' // หรือใส่ domain จริง
}));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

let logs = [];
const MAX_LOGS = 200;

function addLog(logData) {
    const log = {
        ...logData,
        id: logData.id || Date.now() + Math.random().toString(36).substr(2, 9),
        time: logData.time || new Date().toISOString()
    };
    
    console.log(`📝 Log added: ${log.type} for: ${log.url || 'N/A'}`);
    
    logs.push(log);
    
    if (logs.length > MAX_LOGS) {
        logs.shift();
    }
}
app.all('/api-proxy/*path', async (req, res) => {
  const path = req.params['path'];
  
  try {
    const response = await axios({
      method: req.method,
      url: `${target}/${path}`,
      data: req.body,
      headers: { ...req.headers, host: new URL(target).host }
    });
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/logs', (req, res) => {
    res.json(logs);
});

app.use((req, res, next) => {
    if (
        req.originalUrl === '/favicon.ico' || 
        req.originalUrl.startsWith('/js/') || 
        req.originalUrl.startsWith('/logs')
    ) {
        return next();
    }

    const startTime = Date.now();
    const logId = Date.now() + Math.random().toString(36).substr(2, 9);

    const oldSend = res.send;
    res.send = function (data) {
        res.locals.responseBody = data;
        return oldSend.apply(res, arguments);
    };

    const requestLog = {
        id: logId,
        time: new Date().toISOString(),
        method: req.method,
        url: req.originalUrl,
        headers: req.headers,
        // สำหรับ GET ให้เอา query มาโชว์เป็น body เพื่อให้เห็นข้อมูลบน monitor
        body: req.method === 'GET' ? req.query : (req.body || null),
        type: 'request',
        status: "processing",
        source: 'server'
    };

    addLog(requestLog);

    res.on('finish', () => {
        let rawBody = res.locals.responseBody;
        let parsedResBody = rawBody;

        if (Buffer.isBuffer(rawBody)) {
            parsedResBody = rawBody.toString('utf8');
        }

        try {
            if (typeof parsedResBody === 'string') {
                parsedResBody = JSON.parse(parsedResBody);
            }
        } catch (e) {
            console.error("Error parsing response body:", e);
        }

        const responseLog = {
            id: logId,
            status: "done",
            statusCode: res.statusCode,
            duration: Date.now() - startTime,
            response: parsedResBody,
            type: 'response',
            url: req.originalUrl,
            source: 'server'
        };

        addLog(responseLog);
    });

    next();
});

const CPALL_URL = process.env.BASE_URL; 
const handleProxyError = (err, res, logId, url) => {
    const errorData = err.response ? err.response.data : { message: err.message };
    const statusCode = err.response ? err.response.status : 500;

    addLog({
        id: logId,
        type: 'response',
        status: 'error',
        statusCode: statusCode,
        response: errorData,
        url: url,
        source: 'server-proxy'
    });

    res.status(statusCode).json(errorData);
};

app.get('/v2/payment/gettoken', async (req, res) => {
    const logId = res.locals.logId;
    try {
        const response = await axios.get(`${CPALL_URL}/v2/payment/gettoken`, {
            headers: {
                'x-api-key': process.env.X_API_KEY,
                'channel': process.env.CHANNEL
            }
        });
        
        global.accessToken = response.data.result?.payload?.access_token;
        res.json(response.data);
    } catch (err) {
        handleProxyError(err, res, logId, req.originalUrl);
    }
});

app.post('/payment/inquiryqrpayment', verifyToken, async (req, res) => {
    const logId = res.locals.logId;
    try {
        const response = await axios.post(`${CPALL_URL}/payment/inquiryqrpayment`, req.body, {
            headers: { 
                'Authorization': req.headers['authorization'],
                'channel': process.env.CHANNEL
            }
        });
        res.json(response.data);
    } catch (err) {
        handleProxyError(err, res, logId, req.originalUrl);
    }
});

app.post('/payment/payment', verifyToken, async (req, res) => {
    const logId = res.locals.logId;
    try {
        const response = await axios.post(`${CPALL_URL}/payment/payment`, req.body, {
            headers: { 
                'Authorization': req.headers['authorization'],
                'channel': req.headers['channel']
            }
        });
        res.json(response.data);
    } catch (err) {
        handleProxyError(err, res, logId, req.originalUrl);
    }
});

app.get('/payment/checkpaymenttransaction', verifyToken, async (req, res) => {
    const logId = res.locals.logId;
    try {
        const response = await axios.get(`${CPALL_URL}/payment/checkpaymenttransaction`, {
            params: req.query,
            headers: { 
                'Authorization': req.headers['authorization'],
                'channel': req.headers['channel']
            }
        });
        res.json(response.data);
    } catch (err) {
        handleProxyError(err, res, logId, req.originalUrl);
    }
});

function verifyToken(req, res, next) {
    const authHeader = req.headers['authorization'];

    if (!authHeader) {
        return res.status(401).json({ message: "No token" });
    }

    const token = authHeader.split(' ')[1];

    if (token !== global.accessToken) {
        return res.status(401).json({ message: "Invalid token" });
    }
    next();
}

app.post('/logs', (req, res) => {
    const log = req.body;
    console.log("Log from Flutter:", log);

    addLog({
        ...log,
        id: log.id || "flutter-" + Date.now(),
        time: new Date().toISOString(),
        source: 'flutter' 
    });

    res.json({ success: true });
});

app.post('/logs/request', (req, res) => {
    const log = {
        ...req.body,
        type: 'request',
        time: new Date().toISOString(),
        source: 'flutter'
    };

    console.log('Request Log:', log);
    addLog(log); 

    res.json({ success: true });
});

app.post('/logs/response', (req, res) => {
    const log = {
        ...req.body,
        type: 'response',
        time: new Date().toISOString(),
        source: 'flutter'
    };

    console.log('Response Log:', log);
    addLog(log);

    res.json({ success: true });
});

const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`Server running on port ${PORT}`);
    });
}

module.exports = app;

app.use((err, req, res, next) => {
    console.error('Express Error:', err.stack);

    addLog({
        id: 'error-' + Date.now(),
        type: 'error',
        statusCode: 500,
        message: err.message,
        url: req.originalUrl,
        time: new Date().toISOString()
    });

    res.status(500).json({
        jsonrpc: "2.0",
        error: {
            code: -32603,
            message: "Internal server error",
            data: err.message
        },
        id: req.body?.id || 0
    });
});

app.delete('/logs/delete', (req, res) => {
    logs = [];
    console.log("All server logs cleared"); 
    res.status(200).send({ message: "All logs deleted successfully" });
});

process.on('uncaughtException', (err) => {
    console.error('CRITICAL: Uncaught Exception:', err);
    addLog({
        type: 'error',
        message: 'CRITICAL: Uncaught Exception: ' + err.message,
        time: new Date().toISOString()
    });
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    addLog({
        type: 'error',
        message: 'Unhandled Rejection: ' + reason,
        time: new Date().toISOString()
    });
});
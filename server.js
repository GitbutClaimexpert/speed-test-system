const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'speed-test-data.json');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Admin credentials
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'admin123';

// Initialize data file if it doesn't exist
async function initializeDataFile() {
    try {
        await fs.access(DATA_FILE);
    } catch {
        await fs.writeFile(DATA_FILE, JSON.stringify([]));
    }
}

// Read data from file
async function readData() {
    try {
        const data = await fs.readFile(DATA_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return [];
    }
}

// Write data to file
async function writeData(data) {
    await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
}

// Admin login endpoint
app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;
    
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        res.json({ success: true, message: 'Login successful' });
    } else {
        res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
});

// Submit speed test result
app.post('/api/test-result', async (req, res) => {
    try {
        const { refNumber, download, upload, ping } = req.body;
        
        // Validate input
        if (!refNumber || !download || !upload || !ping) {
            return res.status(400).json({ 
                success: false, 
                message: 'Missing required fields' 
            });
        }

        const data = await readData();
        
        const newResult = {
            id: Date.now().toString(),
            refNumber: refNumber.toString(),
            download: parseFloat(download),
            upload: parseFloat(upload),
            ping: parseInt(ping),
            timestamp: new Date().toISOString(),
            ip: req.ip || req.connection.remoteAddress
        };

        data.push(newResult);
        await writeData(data);

        res.json({ 
            success: true, 
            message: 'Test result saved successfully',
            result: newResult
        });
    } catch (error) {
        console.error('Error saving test result:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error saving test result' 
        });
    }
});

// Get all test results (admin only)
app.get('/api/admin/results', async (req, res) => {
    try {
        const data = await readData();
        res.json({ 
            success: true, 
            results: data 
        });
    } catch (error) {
        console.error('Error fetching results:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error fetching results' 
        });
    }
});

// Clear all data (admin only)
app.delete('/api/admin/results', async (req, res) => {
    try {
        await writeData([]);
        res.json({ 
            success: true, 
            message: 'All data cleared successfully' 
        });
    } catch (error) {
        console.error('Error clearing data:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error clearing data' 
        });
    }
});

// Start server
initializeDataFile().then(() => {
    app.listen(PORT, () => {
        console.log(`Speed Test Server running on http://localhost:${PORT}`);
        console.log(`Admin credentials: username="${ADMIN_USERNAME}", password="${ADMIN_PASSWORD}"`);
    });
});

const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

// Database connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Admin credentials
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'admin123';

// Initialize database table
async function initializeDatabase() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS speed_tests (
                id SERIAL PRIMARY KEY,
                ref_number VARCHAR(255) NOT NULL,
                download DECIMAL(10, 2) NOT NULL,
                upload DECIMAL(10, 2) NOT NULL,
                ping INTEGER NOT NULL,
                test_type VARCHAR(50) DEFAULT 'automated',
                ip VARCHAR(255),
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Add test_type column if it doesn't exist (for existing databases)
        try {
            await pool.query(`
                ALTER TABLE speed_tests 
                ADD COLUMN IF NOT EXISTS test_type VARCHAR(50) DEFAULT 'automated'
            `);
        } catch (err) {
            // Column might already exist, ignore error
            console.log('test_type column may already exist');
        }
        
        console.log('Database table initialized');
    } catch (error) {
        console.error('Error initializing database:', error);
    }
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
        const { refNumber, download, upload, ping, testType } = req.body;
        
        if (!refNumber || !download || !upload || !ping) {
            return res.status(400).json({ 
                success: false, 
                message: 'Missing required fields' 
            });
        }

        const ip = req.ip || req.connection.remoteAddress;

        const result = await pool.query(
            'INSERT INTO speed_tests (ref_number, download, upload, ping, test_type, ip) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [refNumber, parseFloat(download), parseFloat(upload), parseInt(ping), testType || 'automated', ip]
        );

        res.json({ 
            success: true, 
            message: 'Test result saved successfully',
            result: result.rows[0]
        });
    } catch (error) {
        console.error('Error saving test result:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error saving test result: ' + error.message
        });
    }
});

// Get all test results (admin only)
app.get('/api/admin/results', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id as "id", ref_number as "refNumber", download, upload, ping, test_type as "testType", ip, timestamp FROM speed_tests ORDER BY timestamp DESC'
        );
        
        res.json({ 
            success: true, 
            results: result.rows 
        });
    } catch (error) {
        console.error('Error fetching results:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error fetching results: ' + error.message
        });
    }
});

// Clear all data (admin only)
app.delete('/api/admin/results', async (req, res) => {
    try {
        await pool.query('DELETE FROM speed_tests');
        res.json({ 
            success: true, 
            message: 'All data cleared successfully' 
        });
    } catch (error) {
        console.error('Error clearing data:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error clearing data: ' + error.message
        });
    }
});

// Upload test endpoint - receives data and reports back
app.post('/api/upload-test', (req, res) => {
    // Just receive the data and send back success
    // The client will measure the time it takes
    res.json({ success: true, received: req.body ? JSON.stringify(req.body).length : 0 });
});

// Download test endpoint - sends test data
app.get('/api/download-test', (req, res) => {
    // Send 1MB of random data
    const size = 1024 * 1024; // 1MB
    const data = Buffer.alloc(size, 'x');
    res.set('Content-Type', 'application/octet-stream');
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.send(data);
});

// Start server
initializeDatabase().then(() => {
    app.listen(PORT, () => {
        console.log(`Speed Test Server running on port ${PORT}`);
        console.log(`Admin credentials: username="${ADMIN_USERNAME}", password="${ADMIN_PASSWORD}"`);
    });
});

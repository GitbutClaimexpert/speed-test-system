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
                ip VARCHAR(255),
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
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
        const { refNumber, download, upload, ping } = req.body;
        
        if (!refNumber || !download || !upload || !ping) {
            return res.status(400).json({ 
                success: false, 
                message: 'Missing required fields' 
            });
        }

        const ip = req.ip || req.connection.remoteAddress;

        const result = await pool.query(
            'INSERT INTO speed_tests (ref_number, download, upload, ping, ip) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [refNumber, parseFloat(download), parseFloat(upload), parseInt(ping), ip]
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
            'SELECT id as "id", ref_number as "refNumber", download, upload, ping, ip, timestamp FROM speed_tests ORDER BY timestamp DESC'
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

// Start server
initializeDatabase().then(() => {
    app.listen(PORT, () => {
        console.log(`Speed Test Server running on port ${PORT}`);
        console.log(`Admin credentials: username="${ADMIN_USERNAME}", password="${ADMIN_PASSWORD}"`);
    });
});

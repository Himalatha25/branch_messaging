const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const cors = require('cors');
const app = express();

// Middleware
app.use(bodyParser.json());
app.use(cors());

// MySQL connection setup
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'hima', // Replace with your MySQL password
    database: 'branch_messaging' // Replace with your database name
});

// Connect to MySQL
db.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
        return;
    }
    console.log('Connected to MySQL database');
});

// Function to check if a message is urgent
function checkIfUrgent(messageBody) {
    const urgentKeywords = ['urgent', 'loan approval', 'emergency', 'asap'];
    return urgentKeywords.some(keyword => messageBody.toLowerCase().includes(keyword));
}

// GET route to fetch all messages with customer details and urgency check
app.get('/api/messages', (req, res) => {
    const query = `
        SELECT m.*, c.name, c.email, c.phone, c.profile_url, c.internal_notes
        FROM messages m
        LEFT JOIN customers c ON m.user_id = c.user_id;
    `;
    db.query(query, (err, results) => {
        if (err) {
            console.error('Database query error:', err);
            res.status(500).json({ error: err.message });
            return;
        }

        // Update the urgency status based on message content
        results.forEach(message => {
            message.is_urgent = checkIfUrgent(message.message_body);
        });

        res.json(results);
    });
});

// API route to respond to a message
app.post('/api/messages/:id/respond', (req, res) => {
    const { response_body } = req.body;
    const messageId = req.params.id;

    const query = 'UPDATE messages SET response_body = ? WHERE id = ?';
    db.query(query, [response_body, messageId], (err) => {
        if (err) {
            console.error('Database query error:', err);
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ message: 'Response sent successfully' });
    });
});

// API route to get all canned messages
app.get('/api/canned-messages', (req, res) => {
    const query = 'SELECT * FROM canned_messages';
    db.query(query, (err, results) => {
        if (err) {
            console.error('Database query error:', err);
            res.status(500).json({ error: 'Error fetching canned messages' });
            return;
        }
        res.json(results);
    });
});

// API route to search for messages based on a query
app.get('/api/messages/search', (req, res) => {
    const { query } = req.query;
    if (!query) {
        res.status(400).json({ error: 'Search query is required' });
        return;
    }

    const searchQuery = `
        SELECT m.*, c.name, c.email, c.phone, c.profile_url, c.internal_notes
        FROM messages m
        LEFT JOIN customers c ON m.user_id = c.user_id
        WHERE m.message_body LIKE ? 
        OR m.user_id LIKE ?
        OR c.name LIKE ?
        OR c.email LIKE ?
        OR c.phone LIKE ?
    `;
    const searchParam = `%${query}%`;

    db.query(searchQuery, [searchParam, searchParam, searchParam, searchParam, searchParam], (err, results) => {
        if (err) {
            console.error('Database query error:', err);
            res.status(500).json({ error: 'Error searching messages' });
            return;
        }
        res.json(results);
    });
});

// Start the server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

// Import necessary modules
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const AWS = require('aws-sdk');

// Initialize Express app
const app = express();
const port = 3000;

// Middleware setup
app.use(bodyParser.json());
app.use(express.static('public')); // Serve static files from a 'public' directory

// Configure AWS with your credentials and region
// IMPORTANT: Replace 'YOUR_ACCESS_KEY_ID' and 'YOUR_SECRET_ACCESS_KEY'
// It is recommended to use environment variables for production.



const docClient = new AWS.DynamoDB.DocumentClient();

// =========================================================================
// Helper Functions for DynamoDB Operations
// =========================================================================

// Function to fetch all items from a table
const fetchAll = async (tableName) => {
    const params = {
        TableName: tableName
    };
    try {
        const data = await docClient.scan(params).promise();
        return data.Items;
    } catch (err) {
        console.error("Error fetching data from", tableName, ":", err);
        return [];
    }
};

// Function to put an item in a table
const putItem = async (tableName, item) => {
    const params = {
        TableName: tableName,
        Item: item
    };
    try {
        await docClient.put(params).promise();
        return true;
    } catch (err) {
        console.error("Error putting item in", tableName, ":", err);
        return false;
    }
};

// Function to delete an item from a table
const deleteItem = async (tableName, key) => {
    const params = {
        TableName: tableName,
        Key: key
    };
    try {
        await docClient.delete(params).promise();
        return true;
    } catch (err) {
        console.error("Error deleting item from", tableName, ":", err);
        return false;
    }
};

// =========================================================================
// Admin Authentication Middleware
// =========================================================================

const authenticateAdmin = (req, res, next) => {
    // This is a simple, hardcoded authentication check for demonstration.
    // In a real application, you would check for a secure session token.
    const token = req.headers['authorization'];
    if (token === 'Bearer my-secret-admin-token') { // Replace with your actual token logic
        next();
    } else {
        res.status(401).send('Unauthorized');
    }
};

// =========================================================================
// User Routes (Public API Endpoints)
// =========================================================================

app.get('/api/team', async (req, res) => {
    const team = await fetchAll('ieee-Team');
    res.json(team);
});

app.get('/api/members', async (req, res) => {
    const members = await fetchAll('ieee-Members');
    res.json(members);
});

app.get('/api/events', async (req, res) => {
    const events = await fetchAll('ieee-Events');
    res.json(events);
});

app.get('/api/gallery', async (req, res) => {
    const gallery = await fetchAll('ieee-Gallery');
    res.json(gallery);
});

// Route for event registration
app.post('/api/register', async (req, res) => {
    const { eventId, name, email, mobile, college, rollnumber } = req.body;
    if (!eventId || !name || !email || !mobile || !college || !rollnumber) {
        return res.status(400).send('All registration fields are required.');
    }
    const registrationId = uuidv4();
    const timestamp = Date.now();
    const success = await putItem('ieee-Registrations', { registrationId, eventId, name, email, mobile, college, rollnumber, timestamp });
    if (success) {
        res.status(201).send('Registration successful!');
    } else {
        res.status(500).send('Failed to register.');
    }
});

// =========================================================================
// Admin Routes (Protected API Endpoints)
// =========================================================================

// NEW SIGN-UP ENDPOINT
app.post('/api/admin/signup', async (req, res) => {
    const { username, password } = req.body;
    const item = {
        username,
        password,
        isAdmin: false // New users are not admins by default
    };

    const success = await putItem('ieee-Users', item);
    if (success) {
        res.status(201).send('User registered successfully! An existing admin will need to grant you access to the admin panel.');
    } else {
        res.status(500).send('Failed to register user.');
    }
});

app.post('/api/admin/login', async (req, res) => {
    const { username, password } = req.body;
    const params = {
        TableName: 'ieee-Users',
        Key: { username }
    };

    try {
        const data = await docClient.get(params).promise();
        const user = data.Item;
        if (user && user.password === password && user.isAdmin) {
            // A simple success message; in a real app, you'd generate a JWT or session token.
            res.json({ success: true, token: 'my-secret-admin-token' });
        } else {
            res.status(401).json({ success: false, message: 'Invalid credentials or not an admin.' });
        }
    } catch (err) {
        console.error("Error during admin login:", err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Admin routes for Team management
app.post('/api/admin/team', authenticateAdmin, async (req, res) => {
    const item = { ...req.body, id: uuidv4() };
    const success = await putItem('ieee-Team', item);
    if (success) res.status(201).send('Team member added.');
    else res.status(500).send('Failed to add team member.');
});

app.put('/api/admin/team/:id', authenticateAdmin, async (req, res) => {
    const { id } = req.params;
    const item = { ...req.body, id };
    const success = await putItem('ieee-Team', item);
    if (success) res.send('Team member updated.');
    else res.status(500).send('Failed to update team member.');
});

app.delete('/api/admin/team/:id', authenticateAdmin, async (req, res) => {
    const { id } = req.params;
    const success = await deleteItem('ieee-Team', { id });
    if (success) res.send('Team member deleted.');
    else res.status(500).send('Failed to delete team member.');
});

// Admin routes for Members management
app.post('/api/admin/members', authenticateAdmin, async (req, res) => {
    const item = { ...req.body, id: uuidv4() };
    const success = await putItem('ieee-Members', item);
    if (success) res.status(201).send('Member added.');
    else res.status(500).send('Failed to add member.');
});

app.put('/api/admin/members/:id', authenticateAdmin, async (req, res) => {
    const { id } = req.params;
    const item = { ...req.body, id };
    const success = await putItem('ieee-Members', item);
    if (success) res.send('Member updated.');
    else res.status(500).send('Failed to update member.');
});

app.delete('/api/admin/members/:id', authenticateAdmin, async (req, res) => {
    const { id } = req.params;
    const success = await deleteItem('ieee-Members', { id });
    if (success) res.send('Member deleted.');
    else res.status(500).send('Failed to delete member.');
});

// Admin routes for Events management
app.post('/api/admin/events', authenticateAdmin, async (req, res) => {
    const item = { ...req.body, id: uuidv4() };
    const success = await putItem('ieee-Events', item);
    if (success) res.status(201).send('Event added.');
    else res.status(500).send('Failed to add event.');
});

app.put('/api/admin/events/:id', authenticateAdmin, async (req, res) => {
    const { id } = req.params;
    const item = { ...req.body, id };
    const success = await putItem('ieee-Events', item);
    if (success) res.send('Event updated.');
    else res.status(500).send('Failed to update event.');
});

app.delete('/api/admin/events/:id', authenticateAdmin, async (req, res) => {
    const { id } = req.params;
    const success = await deleteItem('ieee-Events', { id });
    if (success) res.send('Event deleted.');
    else res.status(500).send('Failed to delete event.');
});

// Admin routes for Gallery management
app.post('/api/admin/gallery', authenticateAdmin, async (req, res) => {
    const item = { ...req.body, id: uuidv4() };
    const success = await putItem('ieee-Gallery', item);
    if (success) res.status(201).send('Gallery item added.');
    else res.status(500).send('Failed to add gallery item.');
});

app.put('/api/admin/gallery/:id', authenticateAdmin, async (req, res) => {
    const { id } = req.params;
    const item = { ...req.body, id };
    const success = await putItem('ieee-Gallery', item);
    if (success) res.send('Gallery item updated.');
    else res.status(500).send('Failed to update gallery item.');
});

app.delete('/api/admin/gallery/:id', authenticateAdmin, async (req, res) => {
    const { id } = req.params;
    const success = await deleteItem('ieee-Gallery', { id });
    if (success) res.send('Gallery item deleted.');
    else res.status(500).send('Failed to delete gallery item.');
});

// Admin route to get all registrations
app.get('/api/admin/registrations', authenticateAdmin, async (req, res) => {
    const registrations = await fetchAll('ieee-Registrations');
    res.json(registrations);
});

// NEW ADMIN USER MANAGEMENT ROUTE
app.get('/api/admin/users', authenticateAdmin, async (req, res) => {
    const users = await fetchAll('ieee-Users');
    res.json(users);
});

app.put('/api/admin/users/:username', authenticateAdmin, async (req, res) => {
    const { username } = req.params;
    const { isAdmin } = req.body;

    const params = {
        TableName: 'ieee-Users',
        Key: { username },
        UpdateExpression: "SET isAdmin = :isAdmin",
        ExpressionAttributeValues: {
            ":isAdmin": isAdmin
        },
        ReturnValues: "UPDATED_NEW"
    };

    try {
        await docClient.update(params).promise();
        res.send('User status updated successfully.');
    } catch (err) {
        console.error("Error updating user status:", err);
        res.status(500).send('Failed to update user status.');
    }
});


// =========================================================================
// Serve HTML Files
// =========================================================================

// Root route to serve the homepage
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server
app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
    console.log('Serving files from:', path.join(__dirname, 'public'));
});

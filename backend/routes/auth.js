const express = require('express');
const fs = require('fs');
const oauth2Client = require('../config/google-calendar');
const { google } = require('googleapis');

const router = express.Router();

router.get('/', (req, res) => {
    const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: ['https://www.googleapis.com/auth/calendar', 'https://www.googleapis.com/auth/userinfo.email']
    });
    res.json({ authUrl });  // Send as JSON instead of plain text
});

router.get('/callback', async (req, res) => {
    try {
        const { tokens } = await oauth2Client.getToken(req.query.code);
        oauth2Client.setCredentials(tokens);
        
        // Get user info
        const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
        const userInfo = await oauth2.userinfo.get();
        
        // Save tokens and email
        const tokenData = {
            ...tokens,
            user_email: userInfo.data.email
        };
        fs.writeFileSync('tokens.json', JSON.stringify(tokenData));
        
        res.redirect('http://localhost:3001?auth=success');
    } catch (error) {
        console.error('Error in OAuth callback:', error);
        res.redirect('http://localhost:3001?auth=error');
    }
});

router.get('/status', (req, res) => {
    const isAuthorized = fs.existsSync('tokens.json');
    let userEmail = '';
    if (isAuthorized) {
        const tokenData = JSON.parse(fs.readFileSync('tokens.json', 'utf8'));
        userEmail = tokenData.user_email || '';
    }
    res.json({ isAuthorized, userEmail });
});

router.post('/signout', (req, res) => {
    try {
        fs.unlinkSync('tokens.json');
        res.json({ success: true });
    } catch (error) {
        console.error('Error during sign out:', error);
        res.status(500).json({ error: 'Failed to sign out' });
    }
});

module.exports = router;
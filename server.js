// server.js
require('dotenv').config();

const express = require('express');
const multer = require('multer');
const { OpenAI } = require('openai');
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const app = express();

// Storage configuration for multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = './recorded';
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    cb(null, 'recording_' + Date.now() + '.webm');
  }
});
const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'audio/webm') {
      cb(null, true);
    } else {
      cb(new Error('Only WebM audio files are allowed'), false);
    }
  }
});
const port = process.env.PORT || 3000;

// OpenAI configuration
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Google Calendar OAuth2 configuration
const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
);

let calendar;

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Route to check if user is authorized
app.get('/', (req, res) => {
    if (!tokens) {
        return res.redirect('/auth');
    }
    res.send('You are already authorized! You can now access Google Calendar.');
});

// Route to start OAuth2 flow
app.get('/auth', (req, res) => {
    const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: ['https://www.googleapis.com/auth/calendar']
    });
    res.redirect(authUrl);
});

// OAuth2 callback route
app.get('/oauth2callback', async (req, res) => {
    const { tokens } = await oauth2Client.getToken(req.query.code);
    oauth2Client.setCredentials(tokens);
    
    // Save tokens to file or database
    fs.writeFileSync('tokens.json', JSON.stringify(tokens));
    
    initializeCalendar();
    
    res.send('Authorization successful!');
});

// Use stored tokens for requests
let tokens;
try {
    tokens = JSON.parse(fs.readFileSync('tokens.json', 'utf-8'));
    oauth2Client.setCredentials(tokens);
    initializeCalendar();
} catch (error) {
    console.log('No tokens found or invalid tokens. User needs to authorize.');
}

function initializeCalendar() {
    calendar = google.calendar({ version: 'v3', auth: oauth2Client });
}

// Route: Upload audio and process it
app.post('/upload-audio', upload.single('audio'), async (req, res) => {
    const audioPath = req.file.path;

    try {
        // Use Whisper API to transcribe the audio to text
        const transcription = await transcribeAudio(audioPath);
        console.log('audioPath:', audioPath);
        console.log('Transcription result:', transcription);

        // Use GPT-4 to parse event details
        const eventDetails = await parseEventDetails(transcription);
        console.log('Event details:', eventDetails);

        // Create Google Calendar event
        const calendarEvent = await createCalendarEvent(eventDetails);
        console.log('Google Calendar event:', calendarEvent);

        res.json({ message: 'Event created', event: calendarEvent });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Failed to create event' });
    }
});

// Use Whisper API to transcribe the audio
async function transcribeAudio(filePath) {
    const fileStream = fs.createReadStream(filePath);
    const response = await openai.audio.transcriptions.create({
        file: fileStream,
        model: 'whisper-1',
        response_format: 'text',
        language: 'en'
    });
    return response;
}

function isValidJSON(content) {
    try {
        JSON.parse(content);
    } catch (error) {
        return false;
    }
    return true;
}

function cleanString(str) {
    return str.replace(/(\r\n|\n|\r|\t)/gm, "");  // Remove newlines, tabs
}


// Use GPT-4o-mini to parse event details
async function parseEventDetails(transcript) {
    const prompt = `Here is the transcribed audio content: "${transcript}". Please extract the event title (mandatory), date (mandatory), start time (if mentioned), end time (if mentioned), location (optional), and descriptions (optional, for any additional information). If no start time, end time, location, or descriptions are mentioned, do not include those fields in the JSON. The fields 'title' and 'date' must always be included. Include any additional relevant details or context in the 'descriptions' field, if available. Only return a valid JSON structure in this format, with no explanations or additional text:
    {
        "title": "Event Title", // Mandatory
        "date": "YYYY-MM-DD", // Mandatory
        "start_time": "HH:MM", // Include this field only if mentioned
        "end_time": "HH:MM",   // Include this field only if mentioned
        "location": "Event Location", // Include this field only if mentioned (optional)
        "descriptions": "Event details or additional information" // Include this field for any additional context (optional)
    }`;
    
    const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
            { role: 'system', content: 'You are an assistant that helps extract event details.' },
            { role: 'user', content: prompt }
        ],
        temperature: 0.7,
    });

    const content = response.choices[0].message.content;
    try {
        if (isValidJSON(content)) {
            const cleanedContent = cleanString(content);
            const eventDetails = JSON.parse(cleanedContent);
            
            // Default time if start_time or end_time is blank
            if (!eventDetails.start_time) {
                eventDetails.start_time = '00:00';  // Default start time if missing
            }
            if (!eventDetails.end_time) {
                eventDetails.end_time = '00:00';  // Default end time if missing
            }
            
            // Combine date and time into ISO format
            eventDetails.start_time = `${eventDetails.date}T${eventDetails.start_time}:00`;
            eventDetails.end_time = `${eventDetails.date}T${eventDetails.end_time}:00`;
            
            return eventDetails;
        } else {
            throw new Error('Received invalid JSON from GPT model');
        }
    } catch (error) {
        console.error('Error:', error);
        throw new Error('Unable to parse event details');
    }
}




// Use Google Calendar API to create an event
async function createCalendarEvent(details) {
    if (!calendar) {
        throw new Error('Calendar is not initialized. User may need to authorize.');
    }

    let description = '';  // Prepare the description field

    if (details.descriptions) {
        description += `Descriptions: ${details.descriptions}\n`;
    }

    let event;

    // If start_time or end_time is blank, treat it as an all-day event
    if (details.start_time.includes('T') && details.end_time.includes('T')) {
        event = {
            summary: details.title,
            location: details.location || "No location provided",  // Ensure location is not empty
            description: description || "No additional details provided",   // Add description or fallback
            start: {
                dateTime: details.start_time,
                timeZone: 'America/New_York',
            },
            end: {
                dateTime: details.end_time,
                timeZone: 'America/New_York',
            },
            reminders: {
                useDefault: false,
                overrides: [
                    { method: 'email', minutes: 24 * 60 },
                    { method: 'popup', minutes: 10 },
                ],
            },
        };
    } else {
        // If times are not provided, treat it as an all-day event
        event = {
            summary: details.title,
            location: details.location || "No location provided",
            description: description || "No additional details provided",   // Add description or fallback
            start: {
                date: details.date,  // All-day event, no time specified
            },
            end: {
                date: details.date,  // Ends on the same day as start
            },
            reminders: {
                useDefault: false,
                overrides: [
                    { method: 'email', minutes: 24 * 60 },
                    { method: 'popup', minutes: 10 },
                ],
            },
        };
    }

    // Log event details to ensure they are correctly formatted
    console.log("Creating event with details:", event);

    try {
        const response = await calendar.events.insert({
            calendarId: 'primary',
            resource: event,
        });
        return response.data;
    } catch (error) {
        console.error('Error creating calendar event:', error.response ? error.response.data : error);
        throw error;
    }
}




// Start the server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});

// server.js
require('dotenv').config();

const express = require('express');
const multer = require('multer');
const { OpenAI } = require('openai');
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const app = express();
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

// Google Calendar configuration
const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
);

// Generate a new URL for authorization
const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/calendar']
});

console.log('Authorize this app by visiting this url:', authUrl);

// After authorization, you'll get a code. Use it to get a new refresh token:
// const {tokens} = await oauth2Client.getToken(code);
// console.log(tokens.refresh_token);

oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

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

// Use GPT-4o-mini to parse event details
async function parseEventDetails(transcript) {
    const prompt = `Here is the transcribed audio content: "${transcript}". Please extract the event title, date, time, duration, and location, and return it in JSON format like this:
{
    "title": "Event Title",
    "date": "YYYY-MM-DD",
    "start_time": "HH:MM",
    "end_time": "HH:MM",
    "location": "Event Location"
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
    console.log('content:', content);
    try {
        var str = '{ "title": "doing homework", "date": "", "start_time": "", "end_time": "", "location": ""}';

        const eventDetails = JSON.parse(str);
        // Combine date and time into ISO format
        eventDetails.start_time = `${eventDetails.date}T${eventDetails.start_time}:00`;
        eventDetails.end_time = `${eventDetails.date}T${eventDetails.end_time}:00`;
        return eventDetails;
    } catch (error) {
        throw new Error('Unable to parse event details');
    }
}

// Use Google Calendar API to create an event
async function createCalendarEvent(details) {
    const event = {
        summary: details.title,
        location: details.location,
        start: {
            dateTime: details.start_time,
            timeZone: 'Asia/Taipei',
        },
        end: {
            dateTime: details.end_time,
            timeZone: 'Asia/Taipei',
        },
        reminders: {
            useDefault: false,
            overrides: [
                { method: 'email', minutes: 24 * 60 },
                { method: 'popup', minutes: 10 },
            ],
        },
    };

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

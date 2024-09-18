const express = require('express');
const upload = require('../middleware/upload');
const transcribeAudio = require('../services/transcription');
const parseEventDetails = require('../services/event-parser');
const createCalendarEvent = require('../services/calendar');

const router = express.Router();

router.post('/upload-audio', upload.single('audio'), async (req, res) => {
    const audioPath = req.file.path;

    try {
        console.log('Starting audio transcription');
        const transcription = await transcribeAudio(audioPath);
        console.log('Transcription result:', transcription);

        console.log('Parsing event details');
        const eventDetails = await parseEventDetails(transcription);
        console.log('Event details:', eventDetails);

        console.log('Creating calendar event');
        const calendarEvent = await createCalendarEvent(eventDetails);
        console.log('Google Calendar event:', calendarEvent);

        res.json({ message: 'Event created', event: calendarEvent });
    } catch (error) {
        console.error('Error in /upload-audio route:', error);
        res.status(500).json({ error: error.message || 'Failed to create event' });
    }
});

module.exports = router;
const { google } = require('googleapis');
const oauth2Client = require('../config/google-calendar');

const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

async function createCalendarEvent(details) {
    let description = '';

    if (details.descriptions) {
        description += `Descriptions: ${details.descriptions}\n`;
    }

    let event;

    if (details.start_time.includes('T') && details.end_time.includes('T')) {
        event = {
            summary: details.title,
            location: details.location || "No location provided",
            description: description || "No additional details provided",
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
        event = {
            summary: details.title,
            location: details.location || "No location provided",
            description: description || "No additional details provided",
            start: {
                date: details.date,
            },
            end: {
                date: details.date,
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

module.exports = createCalendarEvent;
const { google } = require('googleapis');
const oauth2Client = require('../config/google-calendar');

const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

async function createCalendarEvent(details) {
    let description = details.descriptions ? `Descriptions: ${details.descriptions}\n` : '';

    const event = {
        summary: details.title || "Untitled event",
        location: details.location || "",
        description: description || "",
        start: {
            ...details.start,
            timeZone: 'America/New_York'
        },
        end: {
            ...details.end,
            timeZone: 'America/New_York'
        },
        reminders: {
            useDefault: false,
            overrides: [
                { method: 'email', minutes: 24 * 60 },
                { method: 'popup', minutes: 10 },
            ],
        },
    };

    console.log("Creating event with details:", event);

    try {
        const response = await calendar.events.insert({
            calendarId: 'primary',
            resource: event,
        });
        console.log("Created event:", response.data);
        return {
            summary: response.data.summary,
            start: response.data.start,
            end: response.data.end
        };
    } catch (error) {
        console.error('Error creating calendar event:', error.response ? error.response.data : error);
        throw error;
    }
}

module.exports = createCalendarEvent;
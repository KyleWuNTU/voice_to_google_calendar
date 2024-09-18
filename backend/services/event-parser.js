const openai = require('../config/openai');

function isValidJSON(content) {
    try {
        JSON.parse(content);
        return true;
    } catch (error) {
        return false;
    }
}

function cleanString(str) {
    return str.replace(/(\r\n|\n|\r|\t)/gm, "");
}

async function parseEventDetails(transcript) {
    const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
            { role: "system", content: "You are a helpful assistant that extracts event details from text." },
            { role: "user", content: `Here is the transcribed audio content: "${transcript}". Please extract the event title (mandatory), date (mandatory), start time (if mentioned), end time (if mentioned), location (optional), and descriptions (optional, for any additional information). If no start time, end time, location, or descriptions are mentioned, do not include those fields in the JSON. The fields 'title' and 'date' must always be included. If the year is not specified in the date, use MM-DD format. Include any additional relevant details or context in the 'descriptions' field, if available. Only return a valid JSON structure in this format, with no explanations or additional text:
    {
        "title": "Event Title", // Mandatory
        "date": "MM-DD" or "YYYY-MM-DD", // Mandatory, use MM-DD if year not specified
        "start_time": "HH:MM", // Include this field only if mentioned
        "end_time": "HH:MM",   // Include this field only if mentioned
        "location": "Event Location", // Include this field only if mentioned (optional)
        "descriptions": "Event details or additional information" // Include this field for any additional context (optional)
    }`
    }]
    });

    const content = response.choices[0].message.content;
    try {
        if (isValidJSON(content)) {
            const cleanedContent = cleanString(content);
            const eventDetails = JSON.parse(cleanedContent);
            
            // Get the current year
            const currentYear = new Date().getFullYear();
            
            // If date is not provided, use today's date
            if (!eventDetails.date) {
                const today = new Date();
                eventDetails.date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
            } else if (eventDetails.date.length === 5) { // MM-DD format
                eventDetails.date = `${currentYear}-${eventDetails.date}`;
            } else if (eventDetails.date.length === 10) { // YYYY-MM-DD format
                const eventYear = parseInt(eventDetails.date.substring(0, 4));
                if (eventYear < currentYear) {
                    eventDetails.date = `${currentYear}${eventDetails.date.substring(4)}`;
                }
            }
            
            if (!eventDetails.start_time && !eventDetails.end_time) {
                // If no time is specified, set it as an all-day event
                eventDetails.start = { date: eventDetails.date };
                eventDetails.end = { date: eventDetails.date };
            } else {
                // If time is specified, format it as before
                eventDetails.start = {
                    dateTime: `${eventDetails.date}T${eventDetails.start_time || '00:00'}:00`,
                    timeZone: 'America/New_York',
                };
                eventDetails.end = {
                    dateTime: `${eventDetails.date}T${eventDetails.end_time || eventDetails.start_time || '00:00'}:00`,
                    timeZone: 'America/New_York',
                };
            }
            
            // Ensure consistent date format
            if (eventDetails.start) {
                const startDate = eventDetails.start.date || eventDetails.start.dateTime;
                if (startDate) {
                    const date = new Date(startDate + 'T00:00:00-05:00'); // Assuming America/New_York timezone
                    const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                    eventDetails.start.date = formattedDate;
                }
            }

            if (eventDetails.end) {
                const endDate = eventDetails.end.date || eventDetails.end.dateTime;
                if (endDate) {
                    const date = new Date(endDate + 'T00:00:00-05:00'); // Assuming America/New_York timezone
                    const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                    eventDetails.end.date = formattedDate;
                }
            }
            
            // Remove the original date, start_time, and end_time properties
            delete eventDetails.date;
            delete eventDetails.start_time;
            delete eventDetails.end_time;
            
            return eventDetails;
        } else {
            throw new Error('Received invalid JSON from GPT model');
        }
    } catch (error) {
        console.error('Error:', error);
        throw new Error('Unable to parse event details');
    }
}

module.exports = parseEventDetails;
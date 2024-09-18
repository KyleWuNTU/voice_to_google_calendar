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
            
            if (!eventDetails.start_time) {
                eventDetails.start_time = '00:00';
            }
            if (!eventDetails.end_time) {
                eventDetails.end_time = '00:00';
            }
            
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

module.exports = parseEventDetails;
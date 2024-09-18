const fs = require('fs');
const openai = require('../config/openai');

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

module.exports = transcribeAudio;
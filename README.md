# Voice to Google Calendar Event

This project is a web application that allows users to create Google Calendar events using voice input. It uses speech recognition to transcribe audio, processes the transcription with OpenAI's GPT model, and then creates an event in the user's Google Calendar.

## Features

- OAuth2 authentication with Google Calendar API
- Audio recording via web interface
- Speech-to-text transcription using OpenAI's Whisper API
- Natural language processing of transcribed text using OpenAI's GPT model
- Automatic creation of Google Calendar events

## Prerequisites

- Node.js (version 12 or higher)
- npm (Node Package Manager)
- Google Cloud Console project with Calendar API enabled
- OpenAI API key

## Setting up Google OAuth Client

To use this application, you'll need to set up your own Google OAuth client. Follow these steps:

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project or select an existing one.
3. Enable the Google Calendar API for your project.
4. Go to the "Credentials" section.
5. Click "Create Credentials" and select "OAuth client ID".
6. Choose "Web application" as the application type.
7. Add `http://localhost:3000` to the "Authorized JavaScript origins".
8. Add `http://localhost:3000/oauth2callback` to the "Authorized redirect URIs".
9. Click "Create" and note down your Client ID and Client Secret.

These credentials will be used in your `.env` file.

## Installation

1. Clone the repository:
   ```
   git clone [your-repo-url]
   cd voice-calendar
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file in the root directory with the following content:
   ```
   OPENAI_API_KEY=your_openai_api_key
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   GOOGLE_REDIRECT_URI=http://localhost:3000/oauth2callback
   PORT=3000
   ```

   Replace the placeholder values with your actual API keys and credentials.

## Usage

1. Start the server:
   ```
   node server.js
   ```

2. Open a web browser and navigate to `http://localhost:3000`

3. If not already authorized, you will be redirected to Google's OAuth consent screen. Grant the necessary permissions.

4. Once authorized, you can use the web interface to record audio and create calendar events.

## Project Structure

- `server.js`: Main server file containing Express.js setup, routes, and API integrations
- `public/index.html`: Frontend HTML file for the web interface
- `package.json`: Node.js project configuration and dependencies

## Dependencies

- express: Web server framework
- dotenv: Environment variable management
- googleapis: Google API client library
- multer: Middleware for handling multipart/form-data
- openai: OpenAI API client

## Notes

- Ensure that your Google Cloud Console project has the Calendar API enabled and that you have set up the OAuth consent screen.
- The application stores OAuth tokens in a `tokens.json` file. Make sure this file is secured and not exposed publicly.
- Audio recordings are temporarily stored in the `recorded/` directory. Consider implementing a cleanup mechanism for these files.
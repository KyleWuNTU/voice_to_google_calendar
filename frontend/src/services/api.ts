const API_BASE_URL = 'http://localhost:3000';

export const api = {
  getAuthUrl: async () => {
    const response = await fetch(`${API_BASE_URL}/auth`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });
    if (!response.ok) throw new Error('Failed to get auth URL');
    return response.json();
  },

  checkAuthStatus: async () => {
    const response = await fetch(`${API_BASE_URL}/auth/status`, {
      headers: {
        'Accept': 'application/json'
      }
    });
    if (!response.ok) throw new Error('Failed to check auth status');
    return response.json();
  },

  signOut: async () => {
    const response = await fetch(`${API_BASE_URL}/auth/signout`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to sign out');
    return response.json();
  },

  uploadAudio: async (audioBlob: Blob) => {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');

    const response = await fetch(`${API_BASE_URL}/upload-audio`, {
      method: 'POST',
      body: formData
    });
    if (!response.ok) throw new Error('Failed to upload audio');
    return response.json();
  },

  createEvent: async (eventDetails: any) => {
    const response = await fetch(`${API_BASE_URL}/create-event`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventDetails),
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to create event');
    return response.json();
  },
};
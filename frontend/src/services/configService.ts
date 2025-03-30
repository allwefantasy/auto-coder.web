import axios from 'axios';

const API_BASE_URL = '/api/config/ui'; // Adjust if your API base URL is different

// Fetch the current UI mode
export const fetchUIMode = async (): Promise<string> => {
  try {
    const response = await axios.get<{ mode: string }>(`${API_BASE_URL}/mode`);
    return response.data.mode;
  } catch (error) {
    console.error('Error fetching UI mode:', error);
    throw error; // Re-throw to allow caller handling
  }
};

// Update the UI mode
export const updateUIMode = async (mode: 'agent' | 'expert'): Promise<string> => {
  try {
    const response = await axios.put<{ mode: string }>(`${API_BASE_URL}/mode`, { mode });
    return response.data.mode;
  } catch (error) {
    console.error('Error updating UI mode:', error);
    throw error;
  }
};


// Fetch the current preview URL
export const fetchPreviewUrl = async (): Promise<string | null> => {
    try {
      const response = await axios.get<{ previewUrl: string | null }>(`${API_BASE_URL}/preview_url`);
      return response.data.previewUrl;
    } catch (error) {
      console.error('Error fetching preview URL:', error);
      // Return null or a default value, or re-throw based on desired behavior
      return null; 
    }
  };
  
  // Update the preview URL
  export const updatePreviewUrl = async (previewUrl: string): Promise<string> => {
    try {
      const response = await axios.put<{ previewUrl: string }>(`${API_BASE_URL}/preview_url`, { previewUrl });
      return response.data.previewUrl;
    } catch (error) {
      console.error('Error updating preview URL:', error);
      throw error;
    }
  };
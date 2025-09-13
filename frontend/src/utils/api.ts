// API Helper for consistent requests to backend
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const defaultHeaders = {
    'Content-Type': 'application/json',
  // Removed 'ngrok-skip-browser-warning' header (only needed when using ngrok)
  };

  const config: RequestInit = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, config);
    return response;
  } catch (error) {
    console.error('API Request failed:', error);
    throw error;
  }
};

export const apiGet = (endpoint: string, token?: string) => {
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  
  return apiRequest(endpoint, {
    method: 'GET',
    headers,
  });
};

export const apiPost = (endpoint: string, data: any, token?: string) => {
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  
  return apiRequest(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });
};
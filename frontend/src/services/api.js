import axios from 'axios';

// GÜNCELLENEN KISIM: localhost yerine 127.0.0.1 kullanıyoruz.
// Mac cihazlarda localhost bazen algılanmaz, bu yüzden IP adresi daha garantidir.
const API_URL = 'http://127.0.0.1:5001/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 60000, // 60 seconds default for general operations
});

// Request interceptor - Token ekleme ve URL kontrolü (SENİN KODUN AYNEN KALDI)
api.interceptors.request.use(
  (config) => {
    // Ensure baseURL is set correctly
    if (!config.baseURL) {
      config.baseURL = API_URL;
    }

    // Ensure URL is properly constructed
    if (config.url) {
      // Remove leading slash from url if baseURL already ends with one
      if (config.url.startsWith('/') && config.baseURL.endsWith('/')) {
        config.url = config.url.substring(1);
      }
      // Add leading slash if missing
      if (!config.url.startsWith('/') && !config.baseURL.endsWith('/')) {
        config.url = '/' + config.url;
      }
    }

    // Add auth token if available
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        if (user && user.token) {
          config.headers.Authorization = `Bearer ${user.token}`;
        }
      }
    } catch (error) {
      // Silently fail if localStorage parsing fails
      console.warn('Failed to parse user from localStorage:', error);
    }

    // Debug logging (only in development)
    if (process.env.NODE_ENV === 'development') {
      console.log('API Request:', {
        method: config.method?.toUpperCase(),
        url: config.url,
        baseURL: config.baseURL,
        fullURL: `${config.baseURL}${config.url}`
      });
    }

    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling (SENİN KODUN AYNEN KALDI)
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('API Error:', {
      message: error.message,
      url: error.config?.url,
      baseURL: error.config?.baseURL,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    });
    return Promise.reject(error);
  }
);

export default api;
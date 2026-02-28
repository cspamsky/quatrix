export const apiFetch = async (url: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('token');

  // Use a relative path, Vite proxy will handle redirection to http://localhost:3001
  const targetUrl = url;

  const headers = {
    ...options.headers,
    Authorization: token ? `Bearer ${token}` : '',
    'Content-Type': options.body
      ? 'application/json'
      : (options.headers as Record<string, string> | undefined)?.['Content-Type'] || '',
  };

  try {
    const response = await fetch(targetUrl, { ...options, headers });

    const isLoginEndpoint = url.includes('/api/login');

    if ((response.status === 401 || response.status === 403) && !isLoginEndpoint) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Use window.location.replace to avoid back button issues and force reload
      window.location.href = '/login';
      throw new Error('AUTH_EXPIRED');
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const error = new Error(errorData.message || `API_ERROR_${response.status}`);
      // Attach a flag to distinguish between API errors and network failures
      (error as any).isApiError = true;
      throw error;
    }

    return response;
  } catch (error: any) {
    if (error.isApiError) {
      // Don't log "Connection failed" for valid API responses that just have error status codes
      throw error;
    }

    const isLocalhost =
      window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

    if (isLocalhost) {
      console.error(
        '❌ Backend connection failed at',
        targetUrl,
        '. Please ensure the server is running on port 3001.'
      );
      throw error;
    }

    // This is a real network failure (CORS, DNS, Timeout, etc.)
    console.error('❌ Network failure for', targetUrl, error);
    throw error;
  }
};

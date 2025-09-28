// Token validation and debugging utilities
export interface TokenInfo {
  valid: boolean;
  expired: boolean;
  payload?: any;
  error?: string;
}

// Clear expired token from localStorage
export function clearExpiredToken(): void {
  const token = localStorage.getItem('token');
  if (token) {
    const tokenInfo = validateToken(token);
    if (tokenInfo.expired) {
      localStorage.removeItem('token');
      console.log('🔄 Expired token cleared from localStorage');
    }
  }
}

export function validateToken(token: string | null): TokenInfo {
  if (!token) {
    return { valid: false, expired: false, error: 'No token provided' };
  }

  try {
    // Parse JWT without verification (for debugging)
    const parts = token.split('.');
    if (parts.length !== 3) {
      return { valid: false, expired: false, error: 'Invalid token format' };
    }

    const payload = JSON.parse(atob(parts[1]));
    const now = Math.floor(Date.now() / 1000);
    const expired = payload.exp && payload.exp < now;

    return {
      valid: !expired,
      expired,
      payload,
      error: expired ? 'Token expired' : undefined
    };
  } catch (error) {
    return { 
      valid: false, 
      expired: false, 
      error: `Token parse error: ${error instanceof Error ? error.message : 'Unknown error'}` 
    };
  }
}

export function getTokenExpirationTime(token: string | null): Date | null {
  const tokenInfo = validateToken(token);
  if (tokenInfo.payload?.exp) {
    return new Date(tokenInfo.payload.exp * 1000);
  }
  return null;
}

export function isTokenExpiringSoon(token: string | null, minutesThreshold: number = 5): boolean {
  const expirationTime = getTokenExpirationTime(token);
  if (!expirationTime) return false;
  
  const thresholdTime = new Date(Date.now() + minutesThreshold * 60 * 1000);
  return expirationTime <= thresholdTime;
}

export function debugTokenInfo(token: string | null): void {
  const info = validateToken(token);
  console.group('🔐 Token Debug Info');
  console.log('Valid:', info.valid);
  console.log('Expired:', info.expired);
  console.log('Error:', info.error || 'None');
  
  if (info.payload) {
    console.log('User ID:', info.payload.id);
    console.log('Username:', info.payload.username);
    console.log('Role:', info.payload.role);
    console.log('Issued At:', new Date(info.payload.iat * 1000));
    console.log('Expires At:', new Date(info.payload.exp * 1000));
    console.log('Time Until Expiry:', Math.round((info.payload.exp * 1000 - Date.now()) / 1000 / 60), 'minutes');
  }
  console.groupEnd();
}

// Auto-refresh token before expiration
export async function refreshTokenIfNeeded(currentToken: string | null): Promise<string | null> {
  if (!currentToken || !isTokenExpiringSoon(currentToken, 10)) {
    return currentToken;
  }

  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    const response = await fetch(`${apiUrl}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${currentToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const result = await response.json();
      if (result.success && result.data?.token) {
        localStorage.setItem('token', result.data.token);
        console.log('✅ Token refreshed successfully');
        return result.data.token;
      }
    }
  } catch (error) {
    console.error('Failed to refresh token:', error);
  }

  return currentToken;
}

// Enhanced fetch with automatic token handling
export async function authenticatedFetch(
  url: string, 
  options: RequestInit = {}
): Promise<Response> {
  let token = localStorage.getItem('token');
  
  // Debug token before request
  if (process.env.NODE_ENV === 'development') {
    debugTokenInfo(token);
  }
  
  // Try to refresh token if needed
  token = await refreshTokenIfNeeded(token);
  
  if (!token) {
    throw new Error('No authentication token available');
  }

  // Construct full URL if relative URL is provided
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
  const fullUrl = url.startsWith('http') ? url : `${apiUrl}${url}`;

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    ...options.headers,
  };

  const response = await fetch(fullUrl, {
    ...options,
    headers,
  });

  // Handle 401 responses
  if (response.status === 401) {
    console.error('🚫 Authentication failed for:', url);
    debugTokenInfo(token);
    
    // Clear invalid token
    localStorage.removeItem('token');
    
    // Redirect to login if in browser environment
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    
    throw new Error('Authentication failed - redirecting to login');
  }

  return response;
}
'use client'

export function setAuthToken(token: string) {
  localStorage.setItem('token', token);
  // Also set a cookie for middleware to access
  document.cookie = `token=${token}; path=/; max-age=${24 * 60 * 60}`; // 24 hours
}

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

export function removeAuthToken() {
  localStorage.removeItem('token');
  // Remove cookie
  document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
}

export function getAuthHeaders(): Record<string, string> {
  const token = getAuthToken();
  if (!token) return {};
  
  return {
    'Authorization': `Bearer ${token}`,
    'x-auth-token': token, // Fallback for middleware
  };
}
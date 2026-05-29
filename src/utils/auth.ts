export interface UserSession {
  token: string;
  name: string;
  email: string;
}

const SESSION_KEY = 'user_session';

/**
 * Saves a secure doctor credentials login session into localStorage.
 */
export const saveSession = (session: UserSession): void => {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
};

/**
 * Retrieves the currently active user session from localStorage if present.
 */
export const getSession = (): UserSession | null => {
  const data = localStorage.getItem(SESSION_KEY);
  if (!data) return null;
  try {
    return JSON.parse(data) as UserSession;
  } catch (err) {
    console.error('Failed to parse session localStorage token:', err);
    return null;
  }
};

/**
 * Clear the current user session from local storage to execute secure logout.
 */
export const clearSession = (): void => {
  localStorage.removeItem(SESSION_KEY);
};

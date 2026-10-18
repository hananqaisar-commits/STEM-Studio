const LAST_USERNAME_KEY = 'stemstudio:last-username';

/** Store only the username for convenience; passwords are never persisted here. */
export function getRememberedUsername(): string {
  try {
    return window.localStorage.getItem(LAST_USERNAME_KEY) ?? '';
  } catch {
    return '';
  }
}

export function rememberUsername(username: string): void {
  try {
    window.localStorage.setItem(LAST_USERNAME_KEY, username.trim());
  } catch {
    // Browser storage can be disabled; sign-in should still work without it.
  }
}

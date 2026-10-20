const LAST_EMAIL_KEY = 'stemstudio:last-email';
const LEGACY_USERNAME_KEY = 'stemstudio:last-username';

/** Store only the email for convenience; passwords are never persisted here. */
export function getRememberedEmail(): string {
  try {
    window.localStorage.removeItem(LEGACY_USERNAME_KEY);
    return window.localStorage.getItem(LAST_EMAIL_KEY) ?? '';
  } catch {
    return '';
  }
}

export function rememberEmail(email: string): void {
  try {
    window.localStorage.setItem(LAST_EMAIL_KEY, email.trim().toLowerCase());
  } catch {
    // Browser storage can be disabled; sign-in should still work without it.
  }
}

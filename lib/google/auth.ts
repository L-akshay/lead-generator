import { google } from 'googleapis';

/**
 * Returns a JWT auth client scoped for both Sheets and Drive.
 * One service account, one auth setup, both APIs.
 *
 * The PRIVATE_KEY env var arrives with literal "\n" sequences that need to
 * be converted back to real newlines for the JWT library to parse it.
 */
export function getGoogleAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

  if (!email || !rawKey) {
    throw new Error('Missing Google service account env vars');
  }

  const privateKey = rawKey.replace(/\\n/g, '\n');

  return new google.auth.JWT({
    email,
    key: privateKey,
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive.file',
    ],
  });
}

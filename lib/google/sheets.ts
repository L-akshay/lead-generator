import { google } from 'googleapis';
import { getGoogleAuth } from './auth';

interface AppendLeadRowInput {
  leadId: string;
  name: string;
  email: string;
  company: string;
  website: string | null;
  status: string;
  pdfUrl: string | null;
}

/**
 * Appends a single lead row to the configured Google Sheet.
 * Sheet must have these headers in row 1 (set up by the user):
 * Timestamp | Name | Email | Company | Website | Status | PDF URL | Lead ID
 */
export async function appendLeadRow(input: AppendLeadRowInput): Promise<void> {
  const sheetId = process.env.GOOGLE_SHEETS_ID;
  if (!sheetId) throw new Error('GOOGLE_SHEETS_ID is not set');

  const auth = getGoogleAuth();
  const sheets = google.sheets({ version: 'v4', auth });

  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range: 'A:H',
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: {
      values: [
        [
          new Date().toISOString(),
          input.name,
          input.email,
          input.company,
          input.website ?? '',
          input.status,
          input.pdfUrl ?? '',
          input.leadId,
        ],
      ],
    },
  });
}

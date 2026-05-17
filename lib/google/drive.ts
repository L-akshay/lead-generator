import { google } from 'googleapis';
import { Readable } from 'stream';
import { getGoogleAuth } from './auth';

interface UploadInput {
  buffer: Buffer;
  fileName: string;
}

/**
 * Uploads a PDF buffer to the configured archive folder.
 * Returns the Drive file ID and a shareable webViewLink.
 */
export async function uploadPdfToDrive(input: UploadInput): Promise<{ fileId: string; webViewLink: string | null }> {
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (!folderId) throw new Error('GOOGLE_DRIVE_FOLDER_ID is not set');

  const auth = getGoogleAuth();
  const drive = google.drive({ version: 'v3', auth });

  const res = await drive.files.create({
    requestBody: {
      name: input.fileName,
      mimeType: 'application/pdf',
      parents: [folderId],
    },
    media: {
      mimeType: 'application/pdf',
      body: Readable.from(input.buffer),
    },
    fields: 'id, webViewLink',
  });

  return {
    fileId: res.data.id ?? '',
    webViewLink: res.data.webViewLink ?? null,
  };
}

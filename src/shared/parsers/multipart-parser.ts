import { APIGatewayProxyEvent } from 'aws-lambda';
import { ValidationError } from '@core/models';
import { ErrorMessages } from '@core/config';
import Busboy from 'busboy';
import { z } from 'zod';

export interface ParsedFile {
  content: Buffer;
  filename?: string;
  encoding: string;
  mimeType: string;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Zod schema for validating ParsedFile
 */
export const parsedCsvSchema = z.object({
  content: z
    .instanceof(Buffer)
    .refine(buffer => buffer.length > 0, { message: ErrorMessages.FILE_CONTENT_EMPTY })
    .refine(buffer => buffer.length <= MAX_FILE_SIZE, {
      message: ErrorMessages.FILE_SIZE_EXCEEDS_LIMIT,
    }),
  filename: z
    .string()
    .optional()
    .refine(filename => !filename || filename.toLowerCase().endsWith('.csv'), {
      message: ErrorMessages.FILE_MUST_HAVE_CSV_EXTENSION,
    }),
  encoding: z.string().min(1, { message: ErrorMessages.ENCODING_REQUIRED }),
  mimeType: z
    .string()
    .refine(
      mimeType => ['application/csv', 'text/plain', 'text/csv'].includes(mimeType.toLowerCase()),
      { message: ErrorMessages.FILE_MUST_BE_CSV }
    ),
});

/**
 * Parses multipart/form-data from API Gateway event
 * @param event - API Gateway event
 * @returns Parsed file data
 */
export async function parseMultipartFormData(event: APIGatewayProxyEvent): Promise<ParsedFile> {
  const contentType = event.headers['content-type'] || event.headers['Content-Type'];

  if (!contentType || !contentType.includes('multipart/form-data')) {
    throw new ValidationError(ErrorMessages.CONTENT_TYPE_MUST_BE_MULTIPART);
  }

  // Get boundary from Content-Type header
  const boundaryMatch = contentType.match(/boundary=([^;]+)/);
  if (!boundaryMatch) {
    throw new ValidationError(ErrorMessages.MISSING_BOUNDARY_IN_CONTENT_TYPE);
  }

  // Decode body - API Gateway may send it as base64 if binary
  let body: Buffer;
  if (event.isBase64Encoded) {
    body = Buffer.from(event.body || '', 'base64');
  } else {
    body = Buffer.from(event.body || '', 'utf-8');
  }

  return new Promise((resolve, reject) => {
    const busboy = Busboy({ headers: { 'content-type': contentType } });

    let fileFound = false;
    let fileCount = 0;
    let parsedFile: ParsedFile | null = null;

    busboy.on('file', (_fieldname, file, info) => {
      fileCount++;

      // If more than one file is detected, discard the rest and throw an error
      if (fileCount > 1) {
        file.resume(); // Discard the rest of the file
        reject(new ValidationError(ErrorMessages.MULTIPLE_FILES_NOT_ALLOWED));
        return;
      }

      const { filename, encoding, mimeType } = info;
      fileFound = true;

      const chunks: Buffer[] = [];
      let totalSize = 0;

      file.on('data', (chunk: Buffer) => {
        totalSize += chunk.length;

        // Size check while reading - abort if the limit is exceeded
        if (totalSize > MAX_FILE_SIZE) {
          file.resume(); // Discard the rest of the file
          reject(new ValidationError(ErrorMessages.FILE_SIZE_EXCEEDS_LIMIT));
          return;
        }

        chunks.push(chunk);
      });

      file.on('end', () => {
        parsedFile = {
          content: Buffer.concat(chunks),
          filename,
          encoding: encoding || 'utf-8',
          mimeType: (mimeType || 'text/csv').toLowerCase(),
        };
      });
    });

    busboy.on('error', (error: Error) => {
      reject(
        new ValidationError(ErrorMessages.INVALID_CSV_FORMAT, {
          originalError: error.message,
        })
      );
    });

    busboy.on('finish', () => {
      if (!fileFound) {
        reject(new ValidationError(ErrorMessages.NO_FILE_FOUND_IN_MULTIPART));
        return;
      }

      if (!parsedFile) {
        reject(new ValidationError(ErrorMessages.FILE_DATA_NOT_PARSED_CORRECTLY));
        return;
      }

      resolve(parsedFile);
    });

    busboy.end(body);
  });
}

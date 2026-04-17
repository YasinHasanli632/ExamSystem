import { HttpErrorResponse } from '@angular/common/http';

type ValidationErrorRecord = Record<string, string[] | string>;

export interface ParsedApiError {
  title: string;
  message: string;
  details: string[];
  statusCode?: number;
}

export function parseApiError(
  error: unknown,
  fallbackMessage = 'Əməliyyat icra olunmadı.'
): ParsedApiError {
  const defaultError: ParsedApiError = {
    title: 'Xəta baş verdi',
    message: fallbackMessage,
    details: []
  };

  if (!error) {
    return defaultError;
  }

  if (error instanceof HttpErrorResponse) {
    const apiError = error.error;

    if (typeof apiError === 'string' && apiError.trim()) {
      return {
        title: buildTitleFromStatus(error.status),
        message: apiError.trim(),
        details: [],
        statusCode: error.status
      };
    }

    if (apiError && typeof apiError === 'object') {
      const message = extractMessageFromObject(apiError as Record<string, unknown>) || fallbackMessage;
      const details = extractDetailsFromObject(apiError as Record<string, unknown>);

      return {
        title: buildTitleFromStatus(error.status),
        message,
        details,
        statusCode: error.status
      };
    }

    if (error.message) {
      return {
        title: buildTitleFromStatus(error.status),
        message: error.message,
        details: [],
        statusCode: error.status
      };
    }

    return {
      title: buildTitleFromStatus(error.status),
      message: fallbackMessage,
      details: [],
      statusCode: error.status
    };
  }

  if (error instanceof Error) {
    return {
      title: 'Xəta baş verdi',
      message: error.message || fallbackMessage,
      details: []
    };
  }

  return defaultError;
}

function extractMessageFromObject(apiError: Record<string, unknown>): string | null {
  const possibleKeys = ['message', 'title', 'detail', 'error', 'Message', 'Title'];

  for (const key of possibleKeys) {
    const value = apiError[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  if (apiError['errors']) {
    const validationMessages = flattenValidationErrors(apiError['errors'] as ValidationErrorRecord);
    if (validationMessages.length > 0) {
      return validationMessages[0];
    }
  }

  return null;
}

function extractDetailsFromObject(apiError: Record<string, unknown>): string[] {
  const details: string[] = [];

  if (apiError['errors']) {
    details.push(...flattenValidationErrors(apiError['errors'] as ValidationErrorRecord));
  }

  const extraKeys = ['details', 'traceId', 'exception', 'Detail'];

  for (const key of extraKeys) {
    const value = apiError[key];

    if (typeof value === 'string' && value.trim()) {
      details.push(value.trim());
    }
  }

  return unique(details);
}

function flattenValidationErrors(errors: ValidationErrorRecord): string[] {
  const result: string[] = [];

  for (const key of Object.keys(errors)) {
    const value = errors[key];

    if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === 'string' && item.trim()) {
          result.push(item.trim());
        }
      }
      continue;
    }

    if (typeof value === 'string' && value.trim()) {
      result.push(value.trim());
    }
  }

  return unique(result);
}

function buildTitleFromStatus(status?: number): string {
  switch (status) {
    case 400:
      return 'Məlumat xətası';
    case 401:
      return 'İcazə tələb olunur';
    case 403:
      return 'İcazə verilmir';
    case 404:
      return 'Məlumat tapılmadı';
    case 409:
      return 'Təkrarlanan məlumat';
    case 500:
      return 'Server xətası';
    default:
      return 'Xəta baş verdi';
  }
}

function unique(items: string[]): string[] {
  return [...new Set(items.filter(Boolean))];
}
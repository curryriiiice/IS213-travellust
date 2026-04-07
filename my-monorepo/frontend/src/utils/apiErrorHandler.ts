/**
 * Standardized API error handling utility for frontend applications.
 *
 * This module provides consistent error handling for all API calls including plan service,
 * with support for different error types, retry logic, and user-friendly messages.
 */

export interface ApiError {
  message: string;
  statusCode: number;
  type: 'validation' | 'network' | 'server' | 'timeout' | 'authentication';
  details?: any;
}

/**
 * Handle API errors and return standardized error object.
 *
 * This function analyzes different types of errors (network, validation, server, timeout)
 * and returns a standardized error object with appropriate messaging.
 *
 * @param error - The error object from API call
 * @param context - Context string for error (e.g., "flight search")
 * @returns Standardized ApiError object
 */
export async function handleApiError(error: any, context: string = "API request"): Promise<ApiError> {
  // Network errors
  if (error.name === 'TypeError' && error.message.includes('fetch')) {
    return {
      message: 'Network error. Please check your connection and try again.',
      statusCode: 0,
      type: 'network'
    };
  }

  // Timeout errors
  if (error.name === 'AbortError' || error.message?.toLowerCase().includes('timeout')) {
    return {
      message: 'Request timed out. Please try again.',
      statusCode: 408,
      type: 'timeout'
    };
  }

  // Authentication errors
  if (error.message?.toLowerCase().includes('unauthorized') ||
      error.message?.toLowerCase().includes('forbidden') ||
      error.message?.toLowerCase().includes('authentication')) {
    return {
      message: 'Authentication required. Please log in and try again.',
      statusCode: 401,
      type: 'authentication',
      details: error.message
    };
  }

  // Parse JSON errors from API responses
  try {
    if (error.response) {
      const errorData = typeof error.response.json === 'function'
        ? await error.response.json()
        : error.response;

      if (errorData?.error) {
        return {
          message: errorData.error,
          statusCode: error.response?.status || 500,
          type: determineErrorType(error.response?.status),
          details: errorData
        };
      }
    }
  } catch {
    // Not a JSON error or parsing failed, continue to default handling
  }

  // Check for HTTP status codes in error object
  if (error.statusCode || error.status) {
    const statusCode = error.statusCode || error.status;
    return {
      message: error.message || getErrorMessageForStatusCode(statusCode, context),
      statusCode,
      type: determineErrorType(statusCode),
      details: error
    };
  }

  // Default error
  return {
    message: `An error occurred during ${context}. Please try again.`,
    statusCode: 500,
    type: 'server',
    details: error.message || error
  };
}

/**
 * Determine error type based on HTTP status code.
 *
 * @param statusCode - HTTP status code
 * @returns Error type string
 */
function determineErrorType(statusCode: number): ApiError['type'] {
  if (statusCode >= 400 && statusCode < 500) {
    if (statusCode === 401 || statusCode === 403) {
      return 'authentication';
    }
    return 'validation';
  }
  if (statusCode === 408) {
    return 'timeout';
  }
  if (statusCode >= 500) {
    return 'server';
  }
  return 'server';
}

/**
 * Get user-friendly error message for HTTP status code.
 *
 * @param statusCode - HTTP status code
 * @param context - Context string for error
 * @returns User-friendly error message
 */
function getErrorMessageForStatusCode(statusCode: number, context: string): string {
  const statusMessages: Record<number, string> = {
    400: 'Invalid request. Please check your input and try again.',
    401: 'Authentication required. Please log in.',
    403: 'You don\'t have permission to perform this action.',
    404: 'Resource not found.',
    408: 'Request timed out. Please try again.',
    429: 'Too many requests. Please wait and try again later.',
    500: 'Server error. Please try again later.',
    502: 'Service temporarily unavailable. Please try again.',
    503: 'Service temporarily unavailable. Please try again later.',
    504: 'Gateway timeout. Please try again.'
  };

  return statusMessages[statusCode] || `An error occurred during ${context}. Please try again.`;
}

/**
 * Check if an error is retryable based on its type.
 *
 * @param error - ApiError object
 * @returns True if error should be retried
 */
export function isRetryableError(error: ApiError): boolean {
  return error.type === 'network' ||
         error.type === 'timeout' ||
         (error.statusCode >= 500 && error.statusCode < 600);
}

/**
 * Retry a function with exponential backoff.
 *
 * @param fn - Async function to retry
 * @param maxRetries - Maximum number of retry attempts (default: 2)
 * @param baseDelay - Base delay in milliseconds (default: 1000)
 * @returns Promise with function result or throws last error
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 2,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      const apiError = await handleApiError(error);

      // Don't retry if error is not retryable or we've exhausted retries
      if (attempt === maxRetries || !isRetryableError(apiError)) {
        throw lastError;
      }

      // Exponential backoff: delay * 2^attempt
      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

/**
 * Create a user-friendly error message for display in UI.
 *
 * @param error - Error object or string
 * @param defaultMessage - Default message if error cannot be parsed
 * @returns User-friendly error message
 */
export async function getUserFriendlyError(
  error: any,
  defaultMessage: string = "Something went wrong. Please try again."
): Promise<string> {
  if (typeof error === 'string') {
    return error;
  }

  if (error instanceof Error) {
    // Try to handle as API error first
    const apiError = await handleApiError(error);
    return apiError.message;
  }

  if (error?.message) {
    return error.message;
  }

  return defaultMessage;
}
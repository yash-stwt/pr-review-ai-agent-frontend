/**
 * Production-grade error handler utility
 * Provides user-friendly error messages while logging detailed error info to console
 */

/**
 * Severity levels for error messages
 */
export const ERROR_SEVERITY = {
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  CRITICAL: 'critical',
};

/**
 * User-friendly error messages mapped by error type
 */
const USER_FRIENDLY_MESSAGES = {
  NETWORK_ERROR: 'Unable to connect to the server. Please check your internet connection and try again.',
  TIMEOUT_ERROR: 'Request took too long to complete. Please try again.',
  VALIDATION_ERROR: 'Invalid request. Please check your input and try again.',
  NOT_FOUND_ERROR: 'The requested resource was not found.',
  UNAUTHORIZED_ERROR: 'You are not authorized to perform this action.',
  FORBIDDEN_ERROR: 'Access denied.',
  SERVER_ERROR: 'Server error occurred. Please try again later.',
  GENERIC_ERROR: 'Something went wrong. Please try again.',
};

/**
 * Parse HTTP status code and return appropriate error type
 */
function getErrorTypeFromStatus(status) {
  if (status >= 500) return 'SERVER_ERROR';
  if (status === 404) return 'NOT_FOUND_ERROR';
  if (status === 403) return 'FORBIDDEN_ERROR';
  if (status === 401) return 'UNAUTHORIZED_ERROR';
  if (status >= 400) return 'VALIDATION_ERROR';
  return 'GENERIC_ERROR';
}

/**
 * Extract error details from various error types
 */
function extractErrorDetails(error) {
  const details = {
    message: error?.message || 'Unknown error',
    stack: error?.stack || null,
    originalError: error,
  };

  if (error?.response) {
    // Axios or similar HTTP error
    details.status = error.response.status;
    details.statusText = error.response.statusText;
    details.data = error.response.data;
    details.headers = error.response.headers;
    details.url = error.response.config?.url;
    details.method = error.response.config?.method;
  }

  return details;
}

/**
 * Log comprehensive error details to console for debugging
 * @param {Error} error - The error object
 * @param {string} context - Context label (e.g., 'API Call: /review/analyze')
 */
function logErrorToConsole(error, context) {
  const details = extractErrorDetails(error);
  const timestamp = new Date().toISOString();

  console.group(`%c❌ Error: ${context}`, 'color: #ff6b7a; font-weight: bold; font-size: 12px;');
  console.log(`%cTimestamp:`, 'color: #98a2c9; font-weight: bold;', timestamp);

  if (details.status) {
    console.log(`%cHTTP Status:`, 'color: #98a2c9; font-weight: bold;', `${details.status} ${details.statusText}`);
  }

  console.log(`%cMessage:`, 'color: #98a2c9; font-weight: bold;', details.message);

  if (details.url) {
    console.log(`%cRequest URL:`, 'color: #98a2c9; font-weight: bold;', details.url);
    console.log(`%cMethod:`, 'color: #98a2c9; font-weight: bold;', details.method?.toUpperCase() || 'N/A');
  }

  if (details.data) {
    console.log(`%cResponse Data:`, 'color: #98a2c9; font-weight: bold;');
    console.log(details.data);
  }

  if (details.headers) {
    console.log(`%cResponse Headers:`, 'color: #98a2c9; font-weight: bold;');
    console.log(details.headers);
  }

  if (details.stack) {
    console.log(`%cStack Trace:`, 'color: #98a2c9; font-weight: bold;');
    console.log(details.stack);
  }

  console.log(`%cFull Error Object:`, 'color: #98a2c9; font-weight: bold;');
  console.log(details.originalError);

  console.groupEnd();
}

/**
 * Get user-friendly error message
 * @param {Error} error - The error object
 * @returns {string} User-friendly error message
 */
function getUserFriendlyMessage(error) {
  const details = extractErrorDetails(error);

  // Network errors
  if (error?.message?.includes('Failed to fetch') || error?.code === 'ECONNABORTED') {
    return USER_FRIENDLY_MESSAGES.NETWORK_ERROR;
  }

  // Timeout errors
  if (error?.code === 'ECONNREFUSED' || error?.message?.includes('timeout')) {
    return USER_FRIENDLY_MESSAGES.TIMEOUT_ERROR;
  }

  // HTTP status errors
  if (details.status) {
    const errorType = getErrorTypeFromStatus(details.status);
    return USER_FRIENDLY_MESSAGES[errorType] || USER_FRIENDLY_MESSAGES.GENERIC_ERROR;
  }

  // Default
  return USER_FRIENDLY_MESSAGES.GENERIC_ERROR;
}

/**
 * Main error handler function
 * Usage: const { userMessage, severity } = handleError(error, 'API Call: /review/analyze');
 *
 * @param {Error} error - The error object to handle
 * @param {string} context - Context label for logging (e.g., 'API Call: /review/analyze')
 * @param {string} customMessage - Optional custom user-friendly message
 * @returns {Object} { userMessage, severity, details }
 */
export function handleError(error, context = 'Operation', customMessage = null) {
  // Extract and log detailed error information
  const details = extractErrorDetails(error);

  // Log to console for debugging
  logErrorToConsole(error, context);

  // Determine severity level based on HTTP status
  let severity = ERROR_SEVERITY.ERROR;
  if (details.status >= 500) {
    severity = ERROR_SEVERITY.CRITICAL;
  } else if (details.status >= 400) {
    severity = ERROR_SEVERITY.ERROR;
  }

  // Get user-friendly message
  const userMessage = customMessage || getUserFriendlyMessage(error);

  return {
    userMessage,
    severity,
    details,
    context,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Utility to handle API response errors
 * @param {Response} response - Fetch API Response object
 * @param {string} context - Context label for logging
 * @returns {Object} { error, shouldThrow } - Error object and whether to throw
 */
export async function handleApiResponse(response, context = 'API Call') {
  if (!response.ok) {
    let responseData = null;
    try {
      responseData = await response.json();
    } catch {
      try {
        responseData = await response.text();
      } catch {
        responseData = null;
      }
    }

    const error = new Error(
      responseData?.message || responseData?.error || response.statusText || 'API request failed'
    );
    error.response = {
      status: response.status,
      statusText: response.statusText,
      data: responseData,
      config: { url: response.url, method: response.method },
      headers: Object.fromEntries(response.headers),
    };

    return {
      error,
      shouldThrow: true,
    };
  }

  return {
    error: null,
    shouldThrow: false,
  };
}

/**
 * Safe JSON parse with error handling
 * @param {string} jsonString - JSON string to parse
 * @param {*} fallback - Fallback value if parsing fails
 * @returns {*} Parsed object or fallback
 */
export function safeJsonParse(jsonString, fallback = null) {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.warn('JSON parse error:', error.message);
    return fallback;
  }
}

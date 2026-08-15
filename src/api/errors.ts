// Custom API Error Class
export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly code?: string;
  public readonly path: string;
  public readonly timestamp: string;
  public readonly isNetworkError: boolean;
  public readonly isAuthError: boolean;
  public readonly isServerError: boolean;
  public readonly isValidationError: boolean;

  constructor(error: {
    message: string;
    statusCode: number;
    code?: string;
    path: string;
    timestamp: string;
  }) {
    super(error.message);
    this.name = 'ApiError';
    this.statusCode = error.statusCode;
    this.code = error.code;
    this.path = error.path;
    this.timestamp = error.timestamp;
    this.isNetworkError = error.statusCode === 0 || error.statusCode >= 500;
    this.isAuthError = error.statusCode === 401 || error.statusCode === 403;
    this.isServerError = error.statusCode >= 500;
    this.isValidationError = error.statusCode === 422;
  }

  static fromResponse(response: Response, data: any): ApiError {
    return new ApiError({
      message: data?.detail || data?.message || response.statusText || 'An error occurred',
      statusCode: response.status,
      code: data?.code,
      path: response.url,
      timestamp: new Date().toISOString(),
    });
  }

  static fromNetworkError(error: Error): ApiError {
    return new ApiError({
      message: error.message || 'Network error occurred',
      statusCode: 0,
      code: 'NETWORK_ERROR',
      path: '',
      timestamp: new Date().toISOString(),
    });
  }

  getUserMessage(): string {
    if (this.isNetworkError) {
      return 'Unable to connect to server. Please check your connection.';
    }
    if (this.isAuthError) {
      return 'Your session has expired. Please log in again.';
    }
    if (this.isValidationError) {
      return 'Invalid data provided. Please check your input.';
    }
    if (this.isServerError) {
      return 'Server error occurred. Please try again later.';
    }
    return this.message;
  }
}
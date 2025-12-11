/**
 * Shared types used across multiple API clients
 */

export interface PaginatedResponse<T> {
  data: {
    data: T[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}




import axios from 'axios';
import type { ApiResponse, AuditReport, RescanReport, HealthData } from './types.ts';

const apiClient = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30s timeout matching backend scan limits
});

/**
 * Extracts a user-friendly error message from Axios errors or API error responses.
 */
export function extractErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const serverError = err.response?.data as ApiResponse<unknown> | undefined;
    if (serverError && serverError.error && serverError.error.message) {
      return serverError.error.message;
    }
    if (err.response?.status === 429) {
      return 'The scanner is currently busy with other audits. Please retry in a few moments.';
    }
    if (err.response?.status === 504) {
      return 'The target webpage took longer than 15 seconds to load or respond.';
    }
    if (err.code === 'ECONNABORTED') {
      return 'Request timed out waiting for the server.';
    }
    if (err.message) {
      return err.message;
    }
  }
  if (err instanceof Error) {
    return err.message;
  }
  return 'An unexpected error occurred while communicating with the audit service.';
}

/**
 * Checks system health
 */
export async function fetchHealth(): Promise<HealthData> {
  const response = await apiClient.get<HealthData>('/health');
  return response.data;
}

/**
 * Initiates a full deterministic webpage audit
 */
export async function startAudit(url: string): Promise<AuditReport> {
  const response = await apiClient.post<ApiResponse<AuditReport>>('/audit', { url });
  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.error?.message || 'Audit failed to return report.');
  }
  return response.data.data;
}

/**
 * Initiates a rescan with previous issue fingerprints to verify resolutions
 */
export async function startRescan(
  url: string,
  previousFingerprints: string[]
): Promise<RescanReport> {
  const response = await apiClient.post<ApiResponse<RescanReport>>('/rescan', {
    url,
    previousFingerprints,
  });
  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.error?.message || 'Rescan failed to return report.');
  }
  return response.data.data;
}

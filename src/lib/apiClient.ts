/**
 * API Client Utility
 * 
 * This module provides secure API client functions for making requests to Supabase
 * Edge Functions and other APIs. It handles authentication using access tokens
 * and properly manages headers to prevent credential leakage.
 * 
 * SECURITY NOTES:
 * - Never expose API keys in fetch headers sent from the browser
 * - Use the Authorization header with Bearer token for user authentication
 * - The VITE_SUPABASE_PUBLISHABLE_KEY is public and safe to use in URLs only
 * - Always validate responses and handle errors properly
 */

import { supabase } from '@/integrations/supabase/client';

export interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: Record<string, unknown>;
  streaming?: boolean;
}

/**
 * Make a secure API request to a Supabase Edge Function
 * Automatically handles authentication using the user's access token
 * 
 * @param functionName - Name of the Supabase Edge Function (e.g., 'chat', 'analyze-emotion')
 * @param options - Request options
 * @returns Response object
 * @throws Error if request fails or user is not authenticated
 */
export async function callSupabaseFunction(
  functionName: string,
  options: ApiRequestOptions = {}
): Promise<Response> {
  const { method = 'POST', body, streaming = false } = options;

  // Validate environment variables
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  if (!supabaseUrl) {
    throw new Error('Supabase URL is not configured');
  }

  // Get current user session for authentication
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !session?.access_token) {
    throw new Error('User is not authenticated. Please log in to continue.');
  }

  const functionUrl = `${supabaseUrl}/functions/v1/${functionName}`;

  // Build request headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session.access_token}`,
    // NOTE: VITE_SUPABASE_PUBLISHABLE_KEY should NOT be sent in custom headers
    // It's only used for client initialization which is safe
  };

  // Make the request
  const response = await fetch(functionUrl, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`API Error (${functionName}):`, response.status, errorText);
    throw new Error(
      `Request to ${functionName} failed with status ${response.status}: ${errorText || response.statusText}`
    );
  }

  return response;
}

/**
 * Make a streaming API request to a Supabase Edge Function
 * Useful for real-time responses like chat or streaming text generation
 * 
 * @param functionName - Name of the Supabase Edge Function
 * @param options - Request options (streaming is always true)
 * @returns ReadableStreamDefaultReader for streaming the response
 */
export async function callSupabaseFunctionStreaming(
  functionName: string,
  options: Omit<ApiRequestOptions, 'streaming'> = {}
) {
  const response = await callSupabaseFunction(functionName, { ...options, streaming: true });

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('No response body received from streaming request');
  }

  return reader;
}

/**
 * Make a direct fetch request with proper security headers
 * Use this for external APIs that don't require Supabase authentication
 * 
 * @param url - Full URL to call
 * @param options - Fetch options
 * @returns Response object
 */
export async function secureApiCall(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  // Ensure HTTPS for all external API calls (security requirement)
  if (!url.startsWith('https://')) {
    throw new Error('Only HTTPS URLs are allowed for external API calls');
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API request failed with status ${response.status}`);
  }

  return response;
}

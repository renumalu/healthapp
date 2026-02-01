// Security Configuration and Best Practices for HumanOS
// This file documents all security measures implemented in the application

/**
 * SECURITY ARCHITECTURE
 * 
 * 1. AUTHENTICATION & AUTHORIZATION
 *    - Uses Supabase Auth with JWT tokens
 *    - All protected routes enforce authentication via ProtectedRoute component
 *    - Session tokens are securely stored and auto-refreshed
 *    - Access tokens are sent via Authorization Bearer header for API calls
 * 
 * 2. ENVIRONMENT VARIABLES
 *    - VITE_ prefixed variables are PUBLIC and safe to expose in browser
 *    - Never commit .env files to git (added to .gitignore)
 *    - Use .env.example as a template for other developers
 *    - Sensitive secrets should only exist on backend/Edge Functions
 *    - All environment variables are validated at runtime
 * 
 * 3. API SECURITY
 *    - Use secure API client (src/lib/apiClient.ts) for all Supabase calls
 *    - Never expose API keys in fetch headers or URLs
 *    - Always use HTTPS for external API calls (enforced in secureApiCall)
 *    - User access tokens are automatically included via Authorization header
 *    - CORS headers are properly configured on Edge Functions
 * 
 * 4. DATA PROTECTION
 *    - localStorage is only used for non-sensitive app preferences
 *    - Session tokens are persisted securely via Supabase
 *    - All user data is stored in encrypted database
 *    - Sensitive data like passwords are never stored in localStorage
 * 
 * 5. THIRD-PARTY INTEGRATIONS
 *    - All external API calls go through secure API client
 *    - API keys for external services stored only in Edge Functions
 *    - Responses are validated before processing
 *    - Error messages don't leak sensitive information
 * 
 * 6. INPUT VALIDATION
 *    - All user inputs are validated with Zod schemas
 *    - Form inputs are typed and checked before API calls
 *    - Error handling prevents information disclosure
 * 
 * 7. DEPENDENCY SECURITY
 *    - Dependencies are regularly updated via package manager
 *    - Only essential dependencies are included
 *    - No eval() or dangerous dynamic code execution
 * 
 * 8. COMPLIANCE & BEST PRACTICES
 *    - HTTPS enforced for all external connections
 *    - CSP headers configured in vite.config.ts
 *    - No sensitive data in error messages
 *    - Proper CORS configuration
 *    - Security headers on all responses
 */

// IMPLEMENTATION DETAILS

/**
 * Secure API Calls Pattern
 * 
 * OLD (INSECURE):
 * const response = await fetch(url, {
 *   headers: {
 *     'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY  // DON'T DO THIS!
 *   }
 * });
 * 
 * NEW (SECURE):
 * import { callSupabaseFunction } from '@/lib/apiClient';
 * const response = await callSupabaseFunction('chat', { body: { ... } });
 * 
 * The apiClient automatically:
 * - Gets user's access token via supabase.auth.getSession()
 * - Sends it via proper Authorization header
 * - Never exposes the public key in custom headers
 * - Validates environment variables exist
 * - Enforces HTTPS for external calls
 * - Provides consistent error handling
 */

/**
 * Component Security Checklist
 * 
 * When creating new components:
 * - Use ProtectedRoute wrapper for authenticated pages
 * - Import secure API client from @/lib/apiClient
 * - Validate all user inputs with Zod
 * - Never store tokens or secrets in localStorage
 * - Use environment variables via import.meta.env only for public values
 * - Handle errors gracefully without exposing sensitive info
 * - Use proper TypeScript types to catch issues at compile time
 */

/**
 * Edge Functions Security
 * 
 * Rules for Supabase Edge Functions:
 * - Secrets (API keys, etc.) stored in Deno.env.get()
 * - Always validate Authorization header and JWT
 * - Use CORS headers to prevent cross-origin attacks
 * - Validate all request inputs
 * - Never log sensitive data
 * - Rate limit if exposed to public
 * - Return proper error codes without leaking details
 */

export const SECURITY_CONFIG = {
  // Security best practices reference
  API_CALL_PATTERN: 'Use callSupabaseFunction from @/lib/apiClient',
  ENV_VALIDATION: 'All env vars validated at runtime in client.ts',
  HTTPS_REQUIRED: true,
  AUTO_REFRESH_TOKENS: true,
  SESSION_PERSISTENCE: true,
  CORS_ENABLED: true,
} as const;

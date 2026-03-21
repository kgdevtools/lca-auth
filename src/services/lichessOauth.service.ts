import type { LichessTokenResponse } from "@/types/lichess";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const LICHESS_HOST = "https://lichess.org";
const LICHESS_TOKEN_URL = `${LICHESS_HOST}/api/token`;

export const LICHESS_SCOPES = "preference:read puzzle:read study:read game:read";

// ─────────────────────────────────────────────────────────────────────────────
// Base64URL encoding (RFC 4648 §5 — no padding)
// ─────────────────────────────────────────────────────────────────────────────

function base64urlEncode(buffer: Uint8Array): string {
  return btoa(String.fromCharCode(...buffer))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

// ─────────────────────────────────────────────────────────────────────────────
// PKCE Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate a cryptographically random PKCE code_verifier.
 * RFC 7636 §4.1 — 43–128 URL-safe characters.
 */
export function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64urlEncode(array);
}

/**
 * Generate a random state parameter for CSRF protection.
 */
export function generateState(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return base64urlEncode(array);
}

/**
 * Derive the PKCE code_challenge from the code_verifier using SHA-256 (S256 method).
 * code_challenge = BASE64URL(SHA256(ASCII(code_verifier)))
 */
export async function generateCodeChallenge(
  codeVerifier: string,
): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return base64urlEncode(new Uint8Array(digest));
}

// ─────────────────────────────────────────────────────────────────────────────
// Authorization URL
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build the full Lichess OAuth 2.0 authorization URL.
 * The user's browser is redirected to this URL to start the OAuth flow.
 */
export function buildAuthorizationUrl(params: {
  clientId: string;
  redirectUri: string;
  scope: string;
  codeChallenge: string;
  state: string;
}): string {
  const url = new URL(`${LICHESS_HOST}/oauth`);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", params.clientId);
  url.searchParams.set("redirect_uri", params.redirectUri);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("code_challenge", params.codeChallenge);
  url.searchParams.set("scope", params.scope);
  url.searchParams.set("state", params.state);
  return url.toString();
}

// ─────────────────────────────────────────────────────────────────────────────
// Token Exchange
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Exchange the authorization code for an access token.
 * Called in the OAuth callback route after Lichess redirects back.
 *
 * POST /api/token
 */
export async function exchangeCodeForToken(params: {
  code: string;
  codeVerifier: string;
  redirectUri: string;
  clientId: string;
}): Promise<LichessTokenResponse> {
  const response = await fetch(LICHESS_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code: params.code,
      code_verifier: params.codeVerifier,
      redirect_uri: params.redirectUri,
      client_id: params.clientId,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    console.error(
      "[lichessOauth.service] Token exchange failed:",
      response.status,
      body,
    );
    throw new Error(
      `Lichess token exchange failed with status ${response.status}`,
    );
  }

  const data = await response.json();
  return data as LichessTokenResponse;
}

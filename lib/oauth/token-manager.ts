import { cache } from "react";

export interface TokenData {
	access_token: string;
	refresh_token?: string;
	expires_in: number;
	token_type: string;
	scope: string;
	expires_at: number;
}

export interface UserProfile {
	id: string;
	name: string;
	email: string;
	avatar?: string;
	provider: string;
	raw_data: any;
}

export interface ClientSession {
	isValid: boolean;
	created_at: number;
	expires_at: number;
	user_id: string;
}

export interface UserSession {
	user: UserProfile;
	tokens: TokenData;
	created_at: number;
	updated_at: number;
}

export interface TokenVerificationStatus {
	verified: boolean;
	method: "client-session" | "provider-check" | "none";
	expiry?: number;
	error?: string;
}

const USER_PROFILE_KEY = "user_profile";
const TOKEN_DATA_KEY = "oauth_token_data";
const CLIENT_SESSION_KEY = "client_session";
const STATE_KEY = "oauth_state";
const PROVIDER_KEY = "oauth_provider";

// Client session duration: 10 minutes
const CLIENT_SESSION_DURATION = 10 * 60 * 1000;

export class TokenManager {
	private static instance: TokenManager;

	private constructor() {}

	static getInstance(): TokenManager {
		if (!TokenManager.instance) {
			TokenManager.instance = new TokenManager();
		}
		return TokenManager.instance;
	}

	// Session management
	saveSession(session: UserSession): void {
		if (typeof window !== "undefined") {
			const { user, tokens, created_at, updated_at } = session;

			// Store user profile in localStorage
			localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(user));

			// Store tokens and session metadata in sessionStorage
			const tokenDataPayload = { tokens, created_at, updated_at };
			sessionStorage.setItem(TOKEN_DATA_KEY, JSON.stringify(tokenDataPayload));
			this.createClientSession(user.id);
		}
	}

	getSession(): UserSession | null {
		if (typeof window === "undefined") return null;

		try {
			const userProfileData = localStorage.getItem(USER_PROFILE_KEY);
			const tokenDataPayload = sessionStorage.getItem(TOKEN_DATA_KEY);

			if (!userProfileData || !tokenDataPayload) {
				return null;
			}

			const user: UserProfile = JSON.parse(userProfileData);
			const { tokens, created_at, updated_at } = JSON.parse(tokenDataPayload);

			const session: UserSession = { user, tokens, created_at, updated_at };

			// Check if token is expired
			if (this.isTokenExpired(session.tokens)) {
				// Try to refresh the token if we have a refresh token
				if (session.tokens.refresh_token) {
					this.refreshToken(
						session.tokens.refresh_token,
						session.user.provider,
						session.user.id,
					).then((newTokens) => {
						if (newTokens) {
							// Update session with new tokens
							const updatedSession = {
								...session,
								tokens: newTokens,
								updated_at: Date.now(),
							};
							this.saveSession(updatedSession);
						} else {
							// If refresh failed, clear session
							this.clearSession();
						}
					});
				} else {
					this.clearSession();
				}
				return null;
			}

			return session;
		} catch (error) {
			console.error("Error parsing session from storage:", error);
			this.clearSession();
			return null;
		}
	}

	clearSession(): void {
		if (typeof window !== "undefined") {
			localStorage.removeItem(USER_PROFILE_KEY);
			sessionStorage.removeItem(TOKEN_DATA_KEY);
			sessionStorage.removeItem(CLIENT_SESSION_KEY);
			sessionStorage.removeItem(STATE_KEY);
			sessionStorage.removeItem(PROVIDER_KEY);
			sessionStorage.removeItem("oauth_auth_code"); // Clear auth code on logout
		}
	}

	// Client session management (5-minute auto-login)
	createClientSession(userId: string): void {
		if (typeof window !== "undefined") {
			const clientSession: ClientSession = {
				isValid: true,
				created_at: Date.now(),
				expires_at: Date.now() + CLIENT_SESSION_DURATION,
				user_id: userId,
			};
			sessionStorage.setItem(CLIENT_SESSION_KEY, JSON.stringify(clientSession));
		}
	}

	getClientSession(): ClientSession | null {
		if (typeof window === "undefined") return null;

		try {
			const sessionData = sessionStorage.getItem(CLIENT_SESSION_KEY);
			if (!sessionData) return null;

			const clientSession: ClientSession = JSON.parse(sessionData);

			// Check if client session is expired
			if (Date.now() >= clientSession.expires_at) {
				this.clearClientSession();
				return null;
			}

			return clientSession;
		} catch (error) {
			console.error("Error parsing client session:", error);
			this.clearClientSession();
			return null;
		}
	}

	clearClientSession(): void {
		if (typeof window !== "undefined") {
			sessionStorage.removeItem(CLIENT_SESSION_KEY);
		}
	}

	isClientSessionValid(): boolean {
		const clientSession = this.getClientSession();
		return clientSession !== null && clientSession.isValid;
	}

	// Combined session validation
	hasValidSession(): boolean {
		const userSession = this.getSession();
		const clientSession = this.getClientSession();

		// User must have both valid OAuth tokens AND valid client session
		return (
			userSession !== null &&
			!this.isTokenExpired(userSession.tokens) &&
			clientSession !== null &&
			clientSession.isValid
		);
	}

	// New synchronous-only check for UI responsiveness
	hasSynchronousSession(): boolean {
		if (typeof window === "undefined") return false;

		try {
			const userProfileData = localStorage.getItem(USER_PROFILE_KEY);
			const tokenDataPayload = sessionStorage.getItem(TOKEN_DATA_KEY);

			if (!userProfileData || !tokenDataPayload) {
				return false;
			}

			const { tokens } = JSON.parse(tokenDataPayload);
			return !this.isTokenExpired(tokens);
		} catch {
			return false;
		}
	}

	// Verify token with the OAuth provider directly using our API
	async verifyTokenWithAPI(
		tokens: TokenData,
		provider: string,
	): Promise<boolean> {
		try {
			const response = await fetch("/api/oauth/verify", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					access_token: tokens.access_token,
					token_type: tokens.token_type,
					provider,
				}),
			});

			if (!response.ok) {
				return false;
			}

			const data = await response.json();
			return data.valid === true;
		} catch (error) {
			console.error("Token API verification error:", error);
			return false;
		}
	}

	// Check if token is valid with the provider,
	// refresh client session if it is, and return result
	async verifyAndRestoreSession(
		skipClientSession: boolean = false,
	): Promise<boolean> {
		try {
			const userSession = this.getSession();
			if (!userSession) return false;

			// First check if token is expired based on local expiry time
			if (this.isTokenExpired(userSession.tokens)) {
				// Try to refresh the token if we have a refresh token
				if (userSession.tokens.refresh_token) {
					const newTokens = await this.refreshToken(
						userSession.tokens.refresh_token,
						userSession.user.provider,
						userSession.user.id,
					);
					if (newTokens) {
						// Update session with new tokens
						const updatedSession = {
							...userSession,
							tokens: newTokens,
							updated_at: Date.now(),
						};
						this.saveSession(updatedSession);
						return true;
					}
				}
				return false;
			}

			// Verify with the provider API
			const isValid = await this.verifyTokenWithAPI(
				userSession.tokens,
				userSession.user.provider,
			);

			if (isValid && !skipClientSession) {
				// Token is valid, restore client session
				this.createClientSession(userSession.user.id);
			}

			return isValid;
		} catch (error) {
			console.error("Verification error:", error);
			return false;
		}
	}

	// Token validation
	isTokenExpired(tokens: TokenData): boolean {
		return Date.now() >= tokens.expires_at;
	}

	// Refresh token functionality
	async refreshToken(
		refreshToken: string,
		provider: string,
		userId: string,
	): Promise<TokenData | null> {
		if (typeof window === "undefined") return null;

		try {
			const response = await fetch("/api/oauth/token", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					grant_type: "refresh_token",
					refresh_token: refreshToken,
					provider: provider,
					user_id: userId,
				}),
			});

			if (!response.ok) {
				const errorData = await response.json();
				console.error("Token refresh failed:", errorData);
				// If refresh token is invalid, clear the session
				if (response.status === 400) {
					this.clearSession();
				}
				return null;
			}

			const { tokens } = await response.json();
			if (!tokens.refresh_token) {
				tokens.refresh_token = refreshToken;
			}

			return tokens;
		} catch (error) {
			console.error("Error refreshing token:", error);
			return null;
		}
	}

	// Manual refresh token method (for UI button)
	async manualRefreshToken(): Promise<boolean> {
		const session = this.getSession();
		if (session && session.tokens.refresh_token) {
			const newTokens = await this.refreshToken(
				session.tokens.refresh_token,
				session.user.provider,
				session.user.id,
			);
			if (newTokens) {
				const updatedSession = {
					...session,
					tokens: newTokens,
					updated_at: Date.now(),
				};
				this.saveSession(updatedSession);
				return true;
			}
			return false;
		}
		return false;
	}

	// State management for CSRF protection
	saveState(state: string, provider: string): void {
		if (typeof window !== "undefined") {
			sessionStorage.setItem(STATE_KEY, state);
			sessionStorage.setItem(PROVIDER_KEY, provider);
		}
	}

	getStoredState(): { state: string | null; provider: string | null } {
		if (typeof window === "undefined") {
			return { state: null, provider: null };
		}

		return {
			state: sessionStorage.getItem(STATE_KEY),
			provider: sessionStorage.getItem(PROVIDER_KEY),
		};
	}

	clearState(): void {
		if (typeof window !== "undefined") {
			sessionStorage.removeItem(STATE_KEY);
			sessionStorage.removeItem(PROVIDER_KEY);
		}
	}

	// Utility methods
	getTokenExpirationTime(tokens: TokenData): Date {
		return new Date(tokens.expires_at);
	}

	getTimeUntilExpiration(tokens: TokenData): number {
		return this.isTokenExpired(tokens) ? 0 : tokens.expires_at - Date.now();
	}

	formatTokenExpiry(tokens: TokenData): string {
		const timeRemaining = this.getTimeUntilExpiration(tokens);

		if (timeRemaining <= 0) {
			return "Expired";
		}

		const hours = Math.floor(timeRemaining / (1000 * 60 * 60));
		const minutes = Math.floor(
			(timeRemaining % (1000 * 60 * 60)) / (1000 * 60),
		);
		const seconds = Math.floor((timeRemaining % (1000 * 60)) / 1000);

		if (hours > 0) {
			return `${hours}h ${minutes}m`;
		} else if (minutes > 0) {
			return `${minutes}m ${seconds}s`;
		} else {
			return `${seconds}s`;
		}
	}

	static formatTokenExpiry(tokens: TokenData): string {
		return TokenManager.getInstance().formatTokenExpiry(tokens);
	}

	isSessionValid(): boolean {
		const session = this.getSession();
		return session !== null && !this.isTokenExpired(session.tokens);
	}

	// Method to restore client session for an existing valid OAuth session
	restoreClientSessionFromOAuth(): boolean {
		try {
			const userSession = this.getSession();
			if (!userSession) return false;

			// Verify the token is still valid (not expired)
			if (this.isTokenExpired(userSession.tokens)) {
				return false;
			}

			// Create new client session
			this.createClientSession(userSession.user.id);
			return true;
		} catch (error) {
			console.error("Error restoring client session:", error);
			return false;
		}
	}

	// Get token verification status
	async getTokenVerificationStatus(): Promise<TokenVerificationStatus> {
		// First check client session
		if (this.hasValidSession()) {
			const clientSession = this.getClientSession();
			return {
				verified: true,
				method: "client-session",
				expiry: clientSession?.expires_at,
			};
		}

		// Client session invalid, check with provider
		try {
			const isValid = await this.verifyAndRestoreSession();
			if (isValid) {
				const clientSession = this.getClientSession();
				return {
					verified: true,
					method: "provider-check",
					expiry: clientSession?.expires_at,
				};
			}
		} catch (error) {
			return {
				verified: false,
				method: "none",
				error: error instanceof Error ? error.message : "Unknown error",
			};
		}

		return {
			verified: false,
			method: "none",
		};
	}
}

// Export singleton instance
export const tokenManager = TokenManager.getInstance();

// Cached version for server components
export const getCachedSession = cache((): UserSession | null => {
	return TokenManager.getInstance().getSession();
});

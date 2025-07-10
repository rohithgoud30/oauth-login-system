import { cache } from "react";

export interface OAuthProvider {
	name: string;
	authUrl: string;
	tokenUrl: string;
	userInfoUrl: string;
	scopes: string[];
}

export interface OAuthConfig {
	discord: OAuthProvider;
	google: OAuthProvider;
	github: OAuthProvider;
}

// Cache the OAuth configuration
export const getClientOAuthConfig = cache(
	(): OAuthConfig => ({
		discord: {
			name: "Discord",
			authUrl: "https://discord.com/api/oauth2/authorize",
			tokenUrl: "https://discord.com/api/oauth2/token",
			userInfoUrl: "https://discord.com/api/users/@me",
			scopes: ["identify", "email"],
		},
		google: {
			name: "Google",
			authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
			tokenUrl: "https://oauth2.googleapis.com/token",
			userInfoUrl: "https://www.googleapis.com/oauth2/v2/userinfo",
			scopes: ["openid", "profile", "email"],
		},
		github: {
			name: "GitHub",
			authUrl: "https://github.com/login/oauth/authorize",
			tokenUrl: "https://github.com/login/oauth/access_token",
			userInfoUrl: "https://api.github.com/user",
			scopes: ["user:email", "read:user"],
		},
	}),
);

export const generateAuthUrl = (
	provider: keyof OAuthConfig,
	state: string,
): string => {
	const config = getClientOAuthConfig()[provider];
	const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

	const clientIds = {
		discord: process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID,
		google: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
		github: process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID,
	};

	const params = new URLSearchParams({
		client_id: clientIds[provider] || "",
		redirect_uri: `${baseUrl}/callback`,
		scope: config.scopes.join(" "),
		response_type: "code",
		state: state,
	});

	if (provider === "google" || provider === "github") {
		params.append("access_type", "offline");
		params.append("prompt", "consent");
	}

	return `${config.authUrl}?${params.toString()}`;
};

export const generateState = (): string => {
	// Use crypto.randomUUID() which is available in modern browsers and Node.js
	if (typeof crypto !== "undefined" && crypto.randomUUID) {
		return crypto.randomUUID();
	}
	// Fallback for older environments
	return (
		Math.random().toString(36).substring(2, 15) +
		Math.random().toString(36).substring(2, 15)
	);
};

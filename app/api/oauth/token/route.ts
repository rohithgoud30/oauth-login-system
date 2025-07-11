import { type NextRequest, NextResponse } from "next/server";
import { cache } from "react";
import { getClientOAuthConfig, type OAuthConfig } from "@/lib/oauth/providers";

interface TokenData {
	access_token: string;
	refresh_token?: string;
	expires_in: number;
	token_type: string;
	scope: string;
	expires_at: number;
}

interface UserProfile {
	id: string;
	name: string;
	email: string;
	avatar?: string;
	provider: string;
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	raw_data: any;
}

interface UserSession {
	user: UserProfile;
	tokens: TokenData;
	created_at: number;
	updated_at: number;
}

interface RawTokenData {
	access_token: string;
	refresh_token?: string;
	expires_in?: number;
	token_type?: string;
	scope?: string;
}

// Function to save user data to our local DB
async function saveUserToDb(userProfile: UserProfile): Promise<UserProfile> {
	const dbUrl = "http://localhost:4000/users";
	const { provider, id } = userProfile;

	try {
		// Check if user exists
		const response = await fetch(`${dbUrl}?id=${id}&provider=${provider}`);
		if (!response.ok) {
			throw new Error(`Failed to fetch user: ${response.statusText}`);
		}
		const existingUsers = await response.json();

		if (existingUsers.length > 0) {
			// User exists, update their record (PATCH is more efficient than PUT)
			const dbUserId = existingUsers[0].id;
			const updateResponse = await fetch(`${dbUrl}/${dbUserId}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ ...userProfile, updatedAt: Date.now() }),
			});
			if (!updateResponse.ok) {
				throw new Error("Failed to update user in DB");
			}
			return await updateResponse.json();
		} else {
			// User doesn't exist, create them (POST)
			const createResponse = await fetch(dbUrl, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					...userProfile,
					createdAt: Date.now(),
					updatedAt: Date.now(),
				}),
			});
			if (!createResponse.ok) {
				throw new Error("Failed to create user in DB");
			}
			return await createResponse.json();
		}
	} catch (error) {
		console.error("Database operation failed:", error);
		return userProfile; // Return original profile if DB ops fail
	}
}

// Function to save or update tokens in our local DB
async function saveOrUpdateTokenInDb(
	tokens: TokenData,
	userId: string,
	provider: string,
) {
	const dbUrl = "http://localhost:4000/tokens";

	try {
		// Check if a token for this user and provider already exists
		const response = await fetch(
			`${dbUrl}?userId=${userId}&provider=${provider}`,
		);
		if (!response.ok) {
			throw new Error(`Failed to fetch token: ${response.statusText}`);
		}
		const existingTokens = await response.json();

		const tokenPayload = {
			...tokens,
			userId,
			provider,
			updatedAt: Date.now(),
		};

		if (existingTokens.length > 0) {
			// Token exists, update it (PATCH)
			const dbTokenId = existingTokens[0].id; // json-server provides a unique id
			await fetch(`${dbUrl}/${dbTokenId}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(tokenPayload),
			});
		} else {
			// No token found, create a new one (POST)
			await fetch(dbUrl, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ ...tokenPayload, createdAt: Date.now() }),
			});
		}
	} catch (error) {
		console.error("Token database operation failed:", error);
	}
}

// Cache the OAuth config for server-side use
const getServerOAuthConfig = cache(() => ({
	discord: {
		clientId: process.env.DISCORD_CLIENT_ID || "",
		clientSecret: process.env.DISCORD_CLIENT_SECRET || "",
		tokenUrl: "https://discord.com/api/oauth2/token",
		userInfoUrl: "https://discord.com/api/users/@me",
	},
	github: {
		clientId: process.env.GITHUB_CLIENT_ID || "",
		clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
		tokenUrl: "https://github.com/login/oauth/access_token",
		userInfoUrl: "https://api.github.com/user",
	},
	google: {
		clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "",
		clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
		tokenUrl: "https://oauth2.googleapis.com/token",
		userInfoUrl: "https://www.googleapis.com/oauth2/v3/userinfo",
	},
}));

export async function POST(request: NextRequest) {
	try {
		const { code, provider, state, refresh_token, user_id } =
			await request.json();

		// Handle refresh token flow
		if (refresh_token && provider && user_id) {
			try {
				const config =
					getServerOAuthConfig()[
						provider as keyof ReturnType<typeof getServerOAuthConfig>
					];
				if (!config) {
					return NextResponse.json(
						{ error: "Invalid provider" },
						{ status: 400 },
					);
				}

				// Prepare refresh token request
				const refreshParams = new URLSearchParams({
					client_id: config.clientId,
					client_secret: config.clientSecret,
					grant_type: "refresh_token",
					refresh_token: refresh_token,
				});

				const tokenResponse = await fetch(config.tokenUrl, {
					method: "POST",
					headers: {
						"Content-Type": "application/x-www-form-urlencoded",
						Accept: "application/json",
						"User-Agent": "OAuth-Learning-System/1.0",
					},
					body: refreshParams.toString(),
				});

				if (!tokenResponse.ok) {
					const errorText = await tokenResponse.text();
					console.error(`${provider} refresh token failed:`, errorText);
					return NextResponse.json(
						{ error: "Refresh token failed" },
						{ status: 400 },
					);
				}

				const tokenData = await tokenResponse.json();

				// Normalize token data
				const tokens: TokenData = {
					access_token: tokenData.access_token,
					// Some providers don't return a new refresh token, so keep the old one if not provided
					refresh_token: tokenData.refresh_token || refresh_token,
					expires_in: tokenData.expires_in || 28800, // 8 hours
					token_type: tokenData.token_type || "Bearer",
					scope:
						tokenData.scope ||
						getClientOAuthConfig()[provider as keyof OAuthConfig].scopes.join(
							" ",
						),
					expires_at: Date.now() + (tokenData.expires_in || 28800) * 1000,
				};

				// If we have a refresh token, we need to fetch the existing user record
				// to properly link the new tokens.
				if (user_id) {
					const userResponse = await fetch(
						`http://localhost:4000/users/${user_id}`,
					);
					if (!userResponse.ok) {
						return NextResponse.json(
							{ error: "User not found for token refresh" },
							{ status: 404 },
						);
					}
					const user = await userResponse.json();

					// Save the newly refreshed tokens to the database
					await saveOrUpdateTokenInDb(tokens, user.id, user.provider);
				}

				// Return the new tokens
				return NextResponse.json({
					tokens,
					success: true,
					message: "Token refreshed successfully",
				});
			} catch (error) {
				console.error("Refresh token error:", error);
				return NextResponse.json(
					{ error: "Internal server error" },
					{ status: 500 },
				);
			}
		}

		// Handle authorization code flow
		if (!code || !provider || !state) {
			return NextResponse.json(
				{ error: "Missing required parameters" },
				{ status: 400 },
			);
		}

		const config =
			getServerOAuthConfig()[
				provider as keyof ReturnType<typeof getServerOAuthConfig>
			];
		if (!config) {
			return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
		}

		const params = new URLSearchParams({
			client_id: config.clientId,
			client_secret: config.clientSecret,
			code: code,
			redirect_uri: `${
				process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
			}/callback`,
			grant_type: "authorization_code",
		});

		const tokenResponse = await fetch(config.tokenUrl, {
			method: "POST",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
				Accept: "application/json", // Important for GitHub to return JSON
				"User-Agent": "OAuth-Learning-System/1.0",
			},
			body: params.toString(),
		});

		if (!tokenResponse.ok) {
			const errorText = await tokenResponse.text();
			console.error(`${provider} token exchange failed:`, errorText);
			return NextResponse.json(
				{ error: "Token exchange failed", details: errorText },
				{ status: 400 },
			);
		}

		let tokenData: RawTokenData;
		const responseText = await tokenResponse.text();

		try {
			// GitHub returns a query string on success, so we need to handle that
			if (responseText.startsWith("access_token=")) {
				const parsed = new URLSearchParams(responseText);
				tokenData = Object.fromEntries(parsed.entries()) as RawTokenData;
			} else {
				// Other providers return JSON
				tokenData = JSON.parse(responseText);
			}
		} catch (error) {
			console.error("Failed to parse token response:", error);
			return NextResponse.json(
				{ error: "Failed to parse token response" },
				{ status: 500 },
			);
		}

		// Normalize token data
		const tokens: TokenData = {
			access_token: tokenData.access_token,
			refresh_token: tokenData.refresh_token,
			expires_in: tokenData.expires_in || 3600, // Default 1 hour
			token_type: tokenData.token_type || "Bearer",
			scope:
				tokenData.scope ||
				getClientOAuthConfig()[provider as keyof OAuthConfig].scopes.join(" "),
			expires_at: Date.now() + (tokenData.expires_in || 3600) * 1000,
		};

		// Step 2: Get user info from provider
		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		let userInfo: any;

		try {
			// Fetch user info from provider API
			const userResponse = await fetch(config.userInfoUrl, {
				headers: {
					Authorization: `${tokens.token_type} ${tokens.access_token}`,
					Accept: "application/json",
					"User-Agent": "OAuth-Learning-System/1.0",
				},
			});

			if (!userResponse.ok) {
				const errorText = await userResponse.text();
				console.error(`${provider} user fetch failed:`, errorText);
				return NextResponse.json(
					{ error: "Failed to fetch user profile" },
					{ status: 400 },
				);
			}

			userInfo = await userResponse.json();
		} catch (error) {
			console.error(`${provider} user info fetch failed:`, error);
			return NextResponse.json(
				{ error: "Failed to fetch user profile" },
				{ status: 400 },
			);
		}

		// Normalize user profile based on provider
		let userProfile: UserProfile;

		switch (provider) {
			case "google":
				userProfile = {
					id: userInfo.sub,
					name: userInfo.name,
					email: userInfo.email,
					avatar: userInfo.picture,
					provider: "google",
					raw_data: userInfo,
				};
				break;
			case "github":
				userProfile = {
					id: String(userInfo.id),
					name: userInfo.name || userInfo.login,
					email: userInfo.email,
					avatar: userInfo.avatar_url,
					provider: "github",
					raw_data: userInfo,
				};
				break;
			case "discord":
				userProfile = {
					id: userInfo.id,
					name: userInfo.global_name || userInfo.username,
					email: userInfo.email,
					avatar: userInfo.avatar
						? `https://cdn.discordapp.com/avatars/${userInfo.id}/${userInfo.avatar}.png`
						: undefined,
					provider: "discord",
					raw_data: userInfo,
				};
				break;
			default:
				return NextResponse.json(
					{ error: "Invalid provider" },
					{ status: 400 },
				);
		}

		// Save user to our local DB
		const savedUser = await saveUserToDb(userProfile);

		// Save tokens to our local DB
		await saveOrUpdateTokenInDb(tokens, savedUser.id, savedUser.provider);

		// Create the full user session object to return to the client
		const session: UserSession = {
			user: savedUser,
			tokens,
			created_at: Date.now(),
			updated_at: Date.now(),
		};

		return NextResponse.json(session);
	} catch (error) {
		console.error("OAuth flow error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

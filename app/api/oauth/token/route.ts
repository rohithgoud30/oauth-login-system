import { type NextRequest, NextResponse } from "next/server";
import { cache } from "react";

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

// Function to save user data to our local DB
async function saveUserToDb(userProfile: UserProfile): Promise<UserProfile> {
	const dbUrl = "http://localhost:4000/users";
	const { provider, id } = userProfile;

	try {
		// Check if user exists
		const response = await fetch(`${dbUrl}?provider=${provider}&id=${id}`);
		const existingUsers = await response.json();

		if (existingUsers.length > 0) {
			// User exists, update their record (PUT)
			const userId = existingUsers[0].id;
			const updateResponse = await fetch(`${dbUrl}/${userId}`, {
				method: "PUT",
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
		// Return the original profile if DB operations fail
		return userProfile;
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
}));

export async function POST(request: NextRequest) {
	try {
		const { code, provider, state, refresh_token } = await request.json();

		// Handle refresh token flow
		if (refresh_token && provider) {
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
					scope: tokenData.scope || "",
					expires_at: Date.now() + (tokenData.expires_in || 28800) * 1000,
				};

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

		const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

		// Exchange authorization code for access token
		const tokenParams = new URLSearchParams({
			client_id: config.clientId,
			client_secret: config.clientSecret,
			code,
			grant_type: "authorization_code",
			redirect_uri: `${baseUrl}/callback`,
		});

		const tokenResponse = await fetch(config.tokenUrl, {
			method: "POST",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
				Accept: "application/json",
				"User-Agent": "OAuth-Learning-System/1.0",
			},
			body: tokenParams.toString(),
		});

		if (!tokenResponse.ok) {
			const errorText = await tokenResponse.text();
			console.error(`${provider} token exchange failed:`, errorText);
			return NextResponse.json(
				{ error: "Token exchange failed" },
				{ status: 400 },
			);
		}

		const tokenData = await tokenResponse.json();

		// Normalize token data
		const tokens: TokenData = {
			access_token: tokenData.access_token,
			refresh_token: tokenData.refresh_token,
			expires_in: tokenData.expires_in || 28800, // 8 hours
			token_type: tokenData.token_type || "Bearer",
			scope: tokenData.scope || "",
			expires_at: Date.now() + (tokenData.expires_in || 28800) * 1000,
		};

		// Fetch user profile
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

		const userData = await userResponse.json();

		// Normalize user profile based on provider
		let userProfile: UserProfile;

		switch (provider) {
			case "discord": {
				userProfile = {
					id: userData.id,
					name: userData.global_name || userData.username,
					email: userData.email,
					avatar: userData.avatar
						? `https://cdn.discordapp.com/avatars/${userData.id}/${userData.avatar}.png`
						: undefined,
					provider: "discord",
					raw_data: userData,
				};
				break;
			}

			case "github": {
				// GitHub might need a separate call for email if not public
				let email = userData.email;
				if (!email) {
					try {
						const emailResponse = await fetch(
							"https://api.github.com/user/emails",
							{
								headers: {
									Authorization: `${tokens.token_type} ${tokens.access_token}`,
									Accept: "application/json",
									"User-Agent": "OAuth-Learning-System/1.0",
								},
							},
						);
						if (emailResponse.ok) {
							const emails = await emailResponse.json();
							const primaryEmail = emails.find((e: any) => e.primary);
							email = primaryEmail?.email || emails[0]?.email;
						}
					} catch (e) {
						console.error("Could not fetch github email", e);
					}
				}

				userProfile = {
					id: userData.id.toString(),
					name: userData.name || userData.login,
					email: email,
					avatar: userData.avatar_url,
					provider: "github",
					raw_data: userData,
				};
				break;
			}
			default:
				return NextResponse.json(
					{ error: "Invalid provider" },
					{ status: 400 },
				);
		}

		// Save user to our local DB
		await saveUserToDb(userProfile);

		// Create user session
		const session: UserSession = {
			user: userProfile,
			tokens,
			created_at: Date.now(),
			updated_at: Date.now(),
		};

		// Return the session data
		return NextResponse.json({
			session,
			success: true,
			message: "Authentication successful",
		});
	} catch (error) {
		console.error("OAuth token exchange error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

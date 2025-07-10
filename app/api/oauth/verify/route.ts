import { type NextRequest, NextResponse } from "next/server";
import { cache } from "react";

// Minimal config needed for token verification
const getVerificationConfig = cache(() => ({
	discord: {
		userInfoUrl: "https://discord.com/api/users/@me",
	},
	github: {
		userInfoUrl: "https://api.github.com/user",
	},
}));

export async function POST(request: NextRequest) {
	try {
		const { access_token, token_type, provider } = await request.json();

		if (!access_token || !token_type || !provider) {
			return NextResponse.json(
				{ error: "Missing required parameters" },
				{ status: 400 },
			);
		}

		const config =
			getVerificationConfig()[
				provider as keyof ReturnType<typeof getVerificationConfig>
			];
		if (!config) {
			return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
		}

		// Verify the token by fetching user info from the provider
		const response = await fetch(config.userInfoUrl, {
			headers: {
				Authorization: `${token_type} ${access_token}`,
				Accept: "application/json",
				"User-Agent": "OAuth-Login-System/1.0",
			},
		});

		if (response.ok) {
			// If we get a successful response, the token is valid
			return NextResponse.json({ valid: true });
		} else {
			// Any error response means the token is invalid
			return NextResponse.json({ valid: false }, { status: 401 });
		}
	} catch (error) {
		console.error("Token verification error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

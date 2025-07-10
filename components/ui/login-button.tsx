"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	generateAuthUrl,
	generateState,
	getClientOAuthConfig,
} from "@/lib/oauth/providers";
import { tokenManager } from "@/lib/oauth/token-manager";
import { useState, useEffect } from "react";
import { Loader2, MessageSquare, Chrome, Github } from "lucide-react";

interface LoginButtonProps {
	provider: "discord" | "github" | "google";
	onLogin?: (provider: string, authUrl: string) => void;
}

// Add a flag to track logins in this session
let hasInitiatedLogin = false;

const providerConfig = {
	discord: {
		name: "Discord",
		color: "bg-[#5865F2] hover:bg-[#4752C4]",
		icon: MessageSquare,
		description: "Sign in with your Discord account",
		available: true,
	},
	github: {
		name: "GitHub",
		color: "bg-[#24292e] hover:bg-[#1a1e22]",
		icon: Github,
		description: "Sign in with GitHub",
		available: true,
	},
	google: {
		name: "Google",
		color: "bg-[#4285F4] hover:bg-[#357AE8]",
		icon: Chrome,
		description: "Sign in with your Google account",
		available: true,
	},
};

export function LoginButton({ provider, onLogin }: LoginButtonProps) {
	const [isLoading, setIsLoading] = useState(false);
	const config = providerConfig[provider];
	const oauthConfig = getClientOAuthConfig()[provider];
	const Icon = config.icon;

	const handleLogin = () => {
		if (!config.available) return;

		// Prevent multiple simultaneous logins that could create duplicate tokens
		if (hasInitiatedLogin) {
			console.warn("Login already in progress, please wait");
			return;
		}

		setIsLoading(true);
		hasInitiatedLogin = true;
		const state = generateState();

		// Store state in sessionStorage for CSRF protection
		tokenManager.saveState(state, provider);

		const authUrl = generateAuthUrl(provider, state);

		if (onLogin) {
			onLogin(provider, authUrl);
		} else {
			window.location.href = authUrl;
		}
	};

	// Reset the flag when component mounts (page reload)
	useEffect(() => {
		return () => {
			// Reset flag when component unmounts to avoid issues if login is canceled
			hasInitiatedLogin = false;
		};
	}, []);

	return (
		<Card className="w-full max-w-md hover:shadow-lg transition-all duration-200 border-2 hover:border-primary/20">
			<CardHeader className="text-center pb-4">
				<CardTitle className="flex items-center justify-center gap-3 text-xl">
					<div
						className={`p-2 rounded-lg ${
							config.color.split(" ")[0]
						} text-white`}
					>
						<Icon className="h-6 w-6" />
					</div>
					{config.name}
					{!config.available && <Badge variant="secondary">Coming Soon</Badge>}
				</CardTitle>
				<CardDescription className="text-sm text-muted-foreground">
					{config.description}
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				<Button
					onClick={handleLogin}
					disabled={isLoading || !config.available}
					className={`w-full text-white font-medium ${
						config.available ? config.color : "bg-gray-400"
					}`}
					size="lg"
				>
					{isLoading ? (
						<>
							<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							Connecting to {config.name}...
						</>
					) : (
						`Sign in with ${config.name}`
					)}
				</Button>

				{config.available && (
					<div className="space-y-3">
						<div>
							<p className="text-sm font-medium text-muted-foreground mb-2">
								OAuth Scopes:
							</p>
							<div className="flex flex-wrap gap-2">
								{oauthConfig.scopes.map((scope) => (
									<Badge key={scope} variant="outline" className="text-xs">
										{scope}
									</Badge>
								))}
							</div>
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	);
}

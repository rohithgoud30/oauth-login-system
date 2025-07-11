"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { tokenManager } from "@/lib/oauth/token-manager";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Loader2, AlertTriangle } from "lucide-react";

interface CallbackState {
	status: "loading" | "success" | "error" | "state_mismatch";
	message: string;
	details?: string;
	provider?: string;
}

export function CallbackContent() {
	const searchParams = useSearchParams();
	const router = useRouter();
	const [state, setState] = useState<CallbackState>({
		status: "loading",
		message: "Processing authentication...",
	});

	useEffect(() => {
		const processCallback = async () => {
			try {
				const code = searchParams.get("code");
				const state = searchParams.get("state");
				const error = searchParams.get("error");
				const errorDescription = searchParams.get("error_description");

				// Handle OAuth errors
				if (error) {
					setState({
						status: "error",
						message: "Authentication failed",
						details: errorDescription || error,
					});
					return;
				}

				if (!code || !state) {
					setState({
						status: "error",
						message: "Missing authorization code or state parameter",
						details:
							"The OAuth provider did not return the required parameters",
					});
					return;
				}

				// Verify state for CSRF protection
				const storedData = tokenManager.getStoredState();
				if (!storedData.state || storedData.state !== state) {
					setState({
						status: "state_mismatch",
						message: "Invalid state parameter",
						details: "Possible CSRF attack detected. Please try again.",
					});
					return;
				}

				const provider = storedData.provider;
				if (!provider) {
					setState({
						status: "error",
						message: "Missing provider information",
						details: "Could not determine which OAuth provider was used",
					});
					return;
				}

				// Store the auth code temporarily for display purposes
				sessionStorage.setItem("oauth_auth_code", code);

				setState({
					status: "loading",
					message: `Exchanging authorization code with ${provider}...`,
					provider,
				});

				// Exchange code for tokens
				const response = await fetch("/api/oauth/token", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						code,
						provider,
						state,
					}),
				});

				const data = await response.json();

				if (!response.ok) {
					setState({
						status: "error",
						message: "Token exchange failed",
						details: data.error || "Unknown error occurred",
						provider,
					});
					return;
				}

				// Save session and redirect
				tokenManager.saveSession(data);
				// Client session is automatically created in saveSession method
				tokenManager.clearState();

				setState({
					status: "success",
					message: "Authentication successful!",
					details: `Successfully authenticated with ${provider}`,
					provider,
				});

				// Redirect to dashboard after a brief delay
				setTimeout(() => {
					router.push("/dashboard");
				}, 2000);
			} catch (error) {
				console.error("Callback processing error:", error);
				setState({
					status: "error",
					message: "Unexpected error occurred",
					details: error instanceof Error ? error.message : "Unknown error",
				});
			}
		};

		processCallback();
	}, [searchParams, router]);

	const getStatusIcon = () => {
		switch (state.status) {
			case "loading":
				return <Loader2 className="h-8 w-8 animate-spin text-blue-600" />;
			case "success":
				return <CheckCircle className="h-8 w-8 text-green-600" />;
			case "state_mismatch":
				return <AlertTriangle className="h-8 w-8 text-yellow-600" />;
			case "error":
				return <XCircle className="h-8 w-8 text-red-600" />;
		}
	};

	const getStatusColor = () => {
		switch (state.status) {
			case "loading":
				return "border-blue-200 bg-blue-50";
			case "success":
				return "border-green-200 bg-green-50";
			case "state_mismatch":
				return "border-yellow-200 bg-yellow-50";
			case "error":
				return "border-red-200 bg-red-50";
		}
	};

	return (
		<div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
			<div className="w-full max-w-md">
				<Card className={`${getStatusColor()} border-2`}>
					<CardHeader className="text-center">
						<div className="flex justify-center mb-4">{getStatusIcon()}</div>
						<CardTitle className="text-xl">{state.message}</CardTitle>
						{state.provider && (
							<div className="flex justify-center">
								<Badge variant="secondary" className="capitalize">
									{state.provider}
								</Badge>
							</div>
						)}
					</CardHeader>
					<CardContent className="space-y-4">
						{state.details && (
							<CardDescription className="text-center text-sm">
								{state.details}
							</CardDescription>
						)}

						{state.status === "success" && (
							<div className="text-center text-sm text-muted-foreground">
								Redirecting to dashboard...
							</div>
						)}

						{(state.status === "error" ||
							state.status === "state_mismatch") && (
							<div className="space-y-3">
								<Button
									onClick={() => router.push("/login")}
									className="w-full"
									variant="outline"
								>
									Try Again
								</Button>

								{state.status === "state_mismatch" && (
									<div className="text-xs text-muted-foreground bg-yellow-100 p-3 rounded-md">
										<strong>Security Note:</strong> The state parameter didn't
										match, which could indicate a CSRF attack. For your
										security, please start the authentication process again.
									</div>
								)}
							</div>
						)}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}

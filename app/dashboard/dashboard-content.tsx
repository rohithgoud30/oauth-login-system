"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
	tokenManager,
	TokenManager,
	type UserSession,
} from "@/lib/oauth/token-manager";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
	LogOut,
	Calendar,
	Copy,
	Check,
	ChevronRight,
	ChevronDown,
	Key,
	User,
	Code,
	Eye,
	EyeOff,
	RotateCcw,
	Clock,
} from "lucide-react";
import { TokenDisplay } from "@/components/ui/token-display";
import { UserCard } from "@/components/ui/user-card";
import { useInactivityTimeout } from "@/hooks/useInactivityTimeout";
import { InactivityTimeoutModal } from "@/components/ui/inactivity-modal";
import { LogoutModal } from "@/components/ui/logout-modal";
import { DashboardSkeleton } from "@/components/ui/dashboard-skeleton";

export function DashboardContent() {
	const router = useRouter();
	const [session, setSession] = useState<UserSession | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [copied, setCopied] = useState<string | null>(null);
	const [authCode, setAuthCode] = useState<string | null>(null);
	const [expandedSteps, setExpandedSteps] = useState<{
		[key: number]: boolean;
	}>({});
	const [showTokens, setShowTokens] = useState<{ [key: string]: boolean }>({});
	const [verificationMethod, setVerificationMethod] = useState<
		"client-session" | "provider-check" | "none"
	>("none");
	const [showInactivityModal, setShowInactivityModal] = useState(false);
	const [showLogoutModal, setShowLogoutModal] = useState(false);
	const [countdown, setCountdown] = useState(60);
	const countdownIntervalRef = useRef<NodeJS.Timeout>();

	const handleLogout = useCallback(() => {
		if (countdownIntervalRef.current) {
			clearInterval(countdownIntervalRef.current);
		}
		tokenManager.clearSession();
		tokenManager.clearClientSession();
		setShowInactivityModal(false);
		setShowLogoutModal(true);
	}, []);

	const redirectToLogin = () => {
		router.push("/login");
	};

	const startCountdown = useCallback(() => {
		setShowInactivityModal(true);
		if (countdownIntervalRef.current) {
			clearInterval(countdownIntervalRef.current);
		}

		let seconds = 60;
		setCountdown(seconds);

		countdownIntervalRef.current = setInterval(() => {
			seconds--;
			setCountdown((prev) => prev - 1);
			if (seconds <= 0) {
				handleLogout();
			}
		}, 1000);
	}, [handleLogout]);

	const { resetTimer } = useInactivityTimeout({
		timeout: 300000, // 5 minutes
		onWarning: startCountdown,
		onTimeout: handleLogout,
	});

	const handleStay = useCallback(() => {
		if (session && tokenManager.isTokenExpired(session.tokens)) {
			handleLogout();
			return;
		}

		setShowInactivityModal(false);
		if (countdownIntervalRef.current) {
			clearInterval(countdownIntervalRef.current);
		}
		resetTimer();
	}, [session, handleLogout, resetTimer]);

	const validateSession = useCallback(async () => {
		setLoading(true);
		try {
			// Get comprehensive verification status
			const verificationStatus =
				await tokenManager.getTokenVerificationStatus();

			if (verificationStatus.verified) {
				// Token is verified, set the method and session
				setVerificationMethod(verificationStatus.method);
				const userSession = tokenManager.getSession();
				if (userSession) {
					setSession(userSession);
				} else {
					router.push("/login");
					return;
				}
			} else {
				// No valid verification, redirect to login
				router.push("/login");
				return;
			}

			// Try to get auth code from sessionStorage
			const storedCode = sessionStorage.getItem("oauth_auth_code");
			if (storedCode) {
				setAuthCode(storedCode);
			}

			setLoading(false);
		} catch (e) {
			setError(e instanceof Error ? e.message : "An unknown error occurred.");
			setTimeout(() => router.push("/login"), 2000);
		} finally {
			setLoading(false);
		}
	}, [router]);

	// Perform a fast, synchronous check on initial load
	useEffect(() => {
		if (!tokenManager.hasSynchronousSession()) {
			router.replace("/login");
		} else {
			// If synchronous check passes, proceed with full validation
			validateSession();
		}
	}, [router, validateSession]);

	// One-time cleanup of old localStorage keys
	useEffect(() => {
		if (typeof window !== "undefined") {
			localStorage.removeItem("oauth_session");
			localStorage.removeItem("client_session");
		}
	}, []);

	const handleManualRefresh = async () => {
		try {
			const refreshed = await tokenManager.manualRefreshToken();
			if (refreshed) {
				const newSession = tokenManager.getSession();
				setSession(newSession);
				alert("Token refreshed successfully!");
			} else {
				alert("Failed to refresh token.");
			}
		} catch (error) {
			alert(`Error refreshing token: ${error}`);
		}
	};

	const copyToClipboard = async (text: string, label: string) => {
		try {
			await navigator.clipboard.writeText(text);
			setCopied(label);
			setTimeout(() => setCopied(null), 2000);
		} catch (err) {
			console.error("Failed to copy:", err);
		}
	};

	const toggleStep = (stepNumber: number) => {
		setExpandedSteps((prev) => ({
			...prev,
			[stepNumber]: !prev[stepNumber],
		}));
	};

	const toggleTokenVisibility = (tokenType: string) => {
		setShowTokens((prev) => ({
			...prev,
			[tokenType]: !prev[tokenType],
		}));
	};

	const formatDate = (timestamp: number) => {
		return new Date(timestamp).toLocaleString();
	};

	const formatDuration = (start: number, end?: number) => {
		const duration = (end || Date.now()) - start;
		const minutes = Math.floor(duration / (1000 * 60));
		const hours = Math.floor(minutes / 60);
		const days = Math.floor(hours / 24);

		if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
		if (hours > 0) return `${hours}h ${minutes % 60}m`;
		return `${minutes}m`;
	};

	if (loading && !session) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-6">
				<div className="text-center space-y-4">
					<div className="inline-block p-3 bg-white rounded-full shadow-md">
						<div className="h-8 w-8 border-t-2 border-b-2 border-blue-600 rounded-full animate-spin"></div>
					</div>
					<p className="text-lg font-medium text-blue-800">
						Loading dashboard...
					</p>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-6">
				<div className="bg-white p-6 rounded-lg shadow-md max-w-md w-full">
					<p className="text-center text-lg font-medium text-red-600 mb-4">
						{error}
					</p>
					<p className="text-center text-gray-600 mb-6">
						You will be redirected to the login page shortly.
					</p>
					<div className="flex justify-center">
						<Button onClick={() => router.push("/login")} className="w-full">
							Return to Login
						</Button>
					</div>
				</div>
			</div>
		);
	}

	if (!session) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-6">
				<div className="bg-white p-6 rounded-lg shadow-md max-w-md w-full">
					<p className="text-center text-lg font-medium text-red-600 mb-4">
						No session found
					</p>
					<p className="text-center text-gray-600 mb-6">
						You may need to sign in again.
					</p>
					<div className="flex justify-center">
						<Button onClick={() => router.push("/login")} className="w-full">
							Return to Login
						</Button>
					</div>
				</div>
			</div>
		);
	}

	const isTokenExpired = tokenManager.isTokenExpired(session.tokens);
	const sessionDuration = formatDuration(session.created_at);
	const clientSession = tokenManager.getClientSession();
	const isClientSessionValid = tokenManager.isClientSessionValid();

	return (
		<div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
			<div className="container mx-auto space-y-6">
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
						<p className="text-muted-foreground">
							OAuth authentication dashboard for {session.user.name}
						</p>
					</div>
					<div className="flex items-center gap-3">
						<Button onClick={startCountdown} variant="secondary">
							Demo Inactivity
						</Button>
						<Button
							onClick={() => {
								handleLogout();
							}}
							variant="destructive"
						>
							Demo Client Session Expired
						</Button>
						<Button
							onClick={() => {
								tokenManager.clearSession();
								tokenManager.clearClientSession();
								router.push("/login");
							}}
							variant="outline"
							className="flex items-center gap-2"
						>
							<LogOut className="h-4 w-4" />
							Logout
						</Button>
					</div>
				</div>

				<InactivityTimeoutModal
					isOpen={showInactivityModal}
					onStay={handleStay}
					onLogout={() => {
						tokenManager.clearSession();
						tokenManager.clearClientSession();
						router.push("/login");
					}}
					countdown={countdown}
				/>

				<LogoutModal
					isOpen={showLogoutModal}
					onClose={redirectToLogin}
					title="Session Expired"
					message="Your session has expired due to inactivity or client timeout."
				/>

				{/* User Profile and Token Info */}
				<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
					{/* User Profile Card */}
					<UserCard user={session.user} />

					{/* Token Display with Refresh Button */}
					<TokenDisplay
						tokens={session.tokens}
						onRefresh={handleManualRefresh}
					/>
				</div>

				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Calendar className="h-5 w-5" />
							OAuth 2.0 Complete Flow
						</CardTitle>
						<CardDescription>
							User → Client → Authorization Server → Resource Server
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="space-y-4">
							{/* Step 1: User → Client */}
							<div className="border rounded-lg p-4 bg-gradient-to-r from-blue-50 to-blue-100">
								<div className="flex items-center gap-4">
									<div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-semibold">
										1
									</div>
									<div className="flex-1">
										<p className="text-sm font-medium">
											👤 User → 🖥️ Client (OAuth App)
										</p>
										<p className="text-xs text-muted-foreground">
											User clicks "Sign in with {session.user.provider}" •{" "}
											{formatDate(session.created_at)}
										</p>
									</div>
									<Button
										variant="ghost"
										size="sm"
										onClick={() => toggleStep(1)}
									>
										{expandedSteps[1] ? (
											<ChevronDown className="h-4 w-4" />
										) : (
											<ChevronRight className="h-4 w-4" />
										)}
									</Button>
								</div>

								{expandedSteps[1] && (
									<div className="mt-4 pt-4 border-t space-y-3">
										<div className="bg-white p-3 rounded border">
											<p className="text-xs font-medium mb-2">
												🖥️ Client Application Details:
											</p>
											<div className="space-y-1 text-xs">
												<p>
													<strong>App Name:</strong> OAuth Login System
												</p>
												<p>
													<strong>Running on:</strong>{" "}
													{typeof window !== "undefined"
														? window.location.origin
														: "localhost:3000"}
												</p>
												<p>
													<strong>User Action:</strong> Clicked login button
												</p>
												<p>
													<strong>Session Started:</strong>{" "}
													{formatDate(session.created_at)}
												</p>
											</div>
										</div>
									</div>
								)}
							</div>

							{/* Step 2: Client → Authorization Server */}
							<div className="border rounded-lg p-4 bg-gradient-to-r from-yellow-50 to-yellow-100">
								<div className="flex items-center gap-4">
									<div className="h-8 w-8 rounded-full bg-yellow-600 flex items-center justify-center text-white text-xs font-semibold">
										2
									</div>
									<div className="flex-1">
										<p className="text-sm font-medium">
											🖥️ Client → 🔐 Authorization Server (
											{session.user.provider})
										</p>
										<p className="text-xs text-muted-foreground">
											Redirect to {session.user.provider} with authorization
											request
										</p>
									</div>
									<Button
										variant="ghost"
										size="sm"
										onClick={() => toggleStep(2)}
									>
										{expandedSteps[2] ? (
											<ChevronDown className="h-4 w-4" />
										) : (
											<ChevronRight className="h-4 w-4" />
										)}
									</Button>
								</div>

								{expandedSteps[2] && (
									<div className="mt-4 pt-4 border-t space-y-3">
										<div className="bg-white p-3 rounded border">
											<p className="text-xs font-medium mb-2">
												🔐 Authorization Server URL:
											</p>
											<p className="text-xs font-mono break-all bg-gray-100 p-2 rounded">
												https://
												{session.user.provider === "discord"
													? "discord.com/api/oauth2/authorize"
													: session.user.provider === "google"
														? "accounts.google.com/oauth2/v2/auth"
														: "github.com/login/oauth/authorize"}
											</p>
										</div>
										<div className="bg-white p-3 rounded border">
											<p className="text-xs font-medium mb-2">
												📋 Request Parameters:
											</p>
											<div className="space-y-1 text-xs font-mono">
												<p>
													<strong>client_id:</strong> {(() => {
														const clientIds = {
															discord:
																process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID,
															google: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
															github: process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID,
														};
														const clientId =
															clientIds[
																session.user.provider as keyof typeof clientIds
															];
														return clientId
															? `${clientId.substring(0, 8)}...`
															: `${session.user.provider}_client_id`;
													})()}
												</p>
												<p>
													<strong>redirect_uri:</strong>{" "}
													{typeof window !== "undefined"
														? window.location.origin
														: "http://localhost:3000"}
													/callback
												</p>
												<p>
													<strong>scope:</strong> {session.tokens.scope}
												</p>
												<p>
													<strong>response_type:</strong> code
												</p>
												<p>
													<strong>state:</strong> {(() => {
														const storedState =
															typeof window !== "undefined"
																? sessionStorage.getItem("oauth_state")
																: null;
														return storedState
															? `${storedState.substring(0, 12)}...`
															: "random_csrf_token";
													})()}
												</p>
											</div>
										</div>
									</div>
								)}
							</div>

							{/* Step 3: Authorization Server → User */}
							<div className="border rounded-lg p-4 bg-gradient-to-r from-purple-50 to-purple-100">
								<div className="flex items-center gap-4">
									<div className="h-8 w-8 rounded-full bg-purple-600 flex items-center justify-center text-white text-xs font-semibold">
										3
									</div>
									<div className="flex-1">
										<p className="text-sm font-medium">
											🔐 Authorization Server → 👤 User
										</p>
										<p className="text-xs text-muted-foreground">
											{session.user.provider} shows permission dialog to user
										</p>
									</div>
									<Button
										variant="ghost"
										size="sm"
										onClick={() => toggleStep(3)}
									>
										{expandedSteps[3] ? (
											<ChevronDown className="h-4 w-4" />
										) : (
											<ChevronRight className="h-4 w-4" />
										)}
									</Button>
								</div>

								{expandedSteps[3] && (
									<div className="mt-4 pt-4 border-t space-y-3">
										<div className="bg-white p-3 rounded border">
											<p className="text-xs font-medium mb-2">
												💬 Permission Dialog:
											</p>
											<div className="bg-gray-100 p-3 rounded text-xs">
												<p>
													<strong>
														"OAuth Login System" wants to access your{" "}
														{session.user.provider} account:
													</strong>
												</p>
												<ul className="mt-2 space-y-1 ml-4">
													{session.tokens.scope.split(" ").map((scope) => (
														<li key={scope}>
															• Access your {scope} information
														</li>
													))}
												</ul>
											</div>
										</div>
										<div className="bg-white p-3 rounded border">
											<p className="text-xs font-medium mb-2">
												👤 User Decision:
											</p>
											<p className="text-xs text-green-600 font-medium">
												✅ User clicked "Authorize" / "Allow"
											</p>
										</div>
									</div>
								)}
							</div>

							{/* Step 4: User → Authorization Server */}
							<div className="border rounded-lg p-4 bg-gradient-to-r from-green-50 to-green-100">
								<div className="flex items-center gap-4">
									<div className="h-8 w-8 rounded-full bg-green-600 flex items-center justify-center text-white text-xs font-semibold">
										4
									</div>
									<div className="flex-1">
										<p className="text-sm font-medium">
											👤 User → 🔐 Authorization Server
										</p>
										<p className="text-xs text-muted-foreground">
											User approves permission request
										</p>
									</div>
									<Button
										variant="ghost"
										size="sm"
										onClick={() => toggleStep(4)}
									>
										{expandedSteps[4] ? (
											<ChevronDown className="h-4 w-4" />
										) : (
											<ChevronRight className="h-4 w-4" />
										)}
									</Button>
								</div>

								{expandedSteps[4] && (
									<div className="mt-4 pt-4 border-t space-y-3">
										<div className="bg-white p-3 rounded border">
											<p className="text-xs font-medium mb-2">
												✅ Permission Granted:
											</p>
											<p className="text-xs text-muted-foreground">
												User has authorized the OAuth Login System to access
												their {session.user.provider} account
											</p>
										</div>
										<div className="bg-white p-3 rounded border">
											<p className="text-xs font-medium mb-2">
												🔒 Security Check:
											</p>
											<p className="text-xs text-muted-foreground">
												Authorization server validates user credentials and
												generates authorization code
											</p>
										</div>
									</div>
								)}
							</div>

							{/* Step 5: Authorization Server → Client */}
							<div className="border rounded-lg p-4 bg-gradient-to-r from-teal-50 to-teal-100">
								<div className="flex items-center gap-4">
									<div className="h-8 w-8 rounded-full bg-teal-600 flex items-center justify-center text-white text-xs font-semibold">
										5
									</div>
									<div className="flex-1">
										<p className="text-sm font-medium">
											🔐 Authorization Server → 🖥️ Client
										</p>
										<p className="text-xs text-muted-foreground">
											Redirect back to client with authorization code
										</p>
									</div>
									<Button
										variant="ghost"
										size="sm"
										onClick={() => toggleStep(5)}
									>
										{expandedSteps[5] ? (
											<ChevronDown className="h-4 w-4" />
										) : (
											<ChevronRight className="h-4 w-4" />
										)}
									</Button>
								</div>

								{expandedSteps[5] && authCode && (
									<div className="mt-4 pt-4 border-t space-y-3">
										<div className="bg-white p-3 rounded border">
											<p className="text-xs font-medium mb-2">
												🔄 Callback URL:
											</p>
											<p className="text-xs font-mono bg-gray-100 p-2 rounded break-all">
												{typeof window !== "undefined"
													? window.location.origin
													: "http://localhost:3000"}
												/callback?code=...&state=...
											</p>
										</div>
										<div className="bg-white p-3 rounded border">
											<div className="flex items-center justify-between mb-2">
												<span className="text-xs font-medium">
													🎫 Authorization Code:
												</span>
												<div className="flex gap-1">
													<Button
														onClick={() => toggleTokenVisibility("authCode")}
														variant="ghost"
														size="sm"
													>
														{showTokens.authCode ? (
															<EyeOff className="h-3 w-3" />
														) : (
															<Eye className="h-3 w-3" />
														)}
													</Button>
													<Button
														onClick={() =>
															copyToClipboard(authCode, "authCode")
														}
														variant="ghost"
														size="sm"
													>
														{copied === "authCode" ? (
															<Check className="h-3 w-3" />
														) : (
															<Copy className="h-3 w-3" />
														)}
													</Button>
												</div>
											</div>
											<div className="bg-gray-100 p-2 rounded text-xs font-mono break-all">
												{showTokens.authCode
													? authCode
													: `${authCode.substring(0, 20)}...`}
											</div>
											<p className="text-xs text-muted-foreground mt-2">
												⏱️ Temporary code{" "}
												{session.user.provider === "discord"
													? "(expires in 5 minutes)"
													: "(expires in 10 minutes)"}{" "}
												- Single use only
											</p>
										</div>
									</div>
								)}
							</div>

							{/* Step 6: Client → Authorization Server */}
							<div className="border rounded-lg p-4 bg-gradient-to-r from-orange-50 to-orange-100">
								<div className="flex items-center gap-4">
									<div className="h-8 w-8 rounded-full bg-orange-600 flex items-center justify-center text-white text-xs font-semibold">
										6
									</div>
									<div className="flex-1">
										<p className="text-sm font-medium">
											🖥️ Client → 🔐 Authorization Server
										</p>
										<p className="text-xs text-muted-foreground">
											Exchange authorization code for access token
										</p>
									</div>
									<Button
										variant="ghost"
										size="sm"
										onClick={() => toggleStep(6)}
									>
										{expandedSteps[6] ? (
											<ChevronDown className="h-4 w-4" />
										) : (
											<ChevronRight className="h-4 w-4" />
										)}
									</Button>
								</div>

								{expandedSteps[6] && (
									<div className="mt-4 pt-4 border-t space-y-3">
										<div className="bg-white p-3 rounded border">
											<p className="text-xs font-medium mb-2">
												🔄 Token Exchange Request:
											</p>
											<div className="space-y-1 text-xs font-mono">
												<p>
													<strong>URL:</strong> {(() => {
														const tokenEndpoints = {
															discord: "https://discord.com/api/oauth2/token",
															google: "https://oauth2.googleapis.com/token",
															github:
																"https://github.com/login/oauth/access_token",
														};
														return (
															tokenEndpoints[
																session.user
																	.provider as keyof typeof tokenEndpoints
															] || `${session.user.provider} token endpoint`
														);
													})()}
												</p>
												<p>
													<strong>Method:</strong> POST
												</p>
												<p>
													<strong>grant_type:</strong> authorization_code
												</p>
												<p>
													<strong>code:</strong>{" "}
													{authCode
														? `${authCode.substring(0, 20)}...`
														: "auth_code"}
												</p>
												<p>
													<strong>client_id:</strong> {(() => {
														const clientIds = {
															discord:
																process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID,
															google: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
															github: process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID,
														};
														const clientId =
															clientIds[
																session.user.provider as keyof typeof clientIds
															];
														return clientId
															? `${clientId.substring(0, 8)}...`
															: "your_client_id";
													})()}
												</p>
												<p>
													<strong>client_secret:</strong> ••••••••••
												</p>
											</div>
										</div>
										<div className="bg-white p-3 rounded border">
											<p className="text-xs font-medium mb-2">
												🔒 Backend Security:
											</p>
											<p className="text-xs text-muted-foreground">
												This exchange happens server-to-server with client
												secret - never exposed to browser
											</p>
										</div>
									</div>
								)}
							</div>

							{/* Step 7: Authorization Server → Client */}
							<div className="border rounded-lg p-4 bg-gradient-to-r from-indigo-50 to-indigo-100">
								<div className="flex items-center gap-4">
									<div className="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-semibold">
										7
									</div>
									<div className="flex-1">
										<p className="text-sm font-medium">
											🔐 Authorization Server → 🖥️ Client
										</p>
										<p className="text-xs text-muted-foreground">
											Returns access token and user permissions
										</p>
									</div>
									<Button
										variant="ghost"
										size="sm"
										onClick={() => toggleStep(7)}
									>
										{expandedSteps[7] ? (
											<ChevronDown className="h-4 w-4" />
										) : (
											<ChevronRight className="h-4 w-4" />
										)}
									</Button>
								</div>

								{expandedSteps[7] && (
									<div className="mt-4 pt-4 border-t space-y-3">
										<div className="bg-white p-3 rounded border">
											<div className="flex items-center justify-between mb-2">
												<span className="text-xs font-medium">
													🎟️ Access Token:
												</span>
												<div className="flex gap-1">
													<Button
														onClick={() => toggleTokenVisibility("accessToken")}
														variant="ghost"
														size="sm"
													>
														{showTokens.accessToken ? (
															<EyeOff className="h-3 w-3" />
														) : (
															<Eye className="h-3 w-3" />
														)}
													</Button>
													<Button
														onClick={() =>
															copyToClipboard(
																session.tokens.access_token,
																"accessToken",
															)
														}
														variant="ghost"
														size="sm"
													>
														{copied === "accessToken" ? (
															<Check className="h-3 w-3" />
														) : (
															<Copy className="h-3 w-3" />
														)}
													</Button>
												</div>
											</div>
											<div className="bg-gray-100 p-2 rounded text-xs font-mono break-all max-h-20 overflow-y-auto">
												{showTokens.accessToken
													? session.tokens.access_token
													: `${session.tokens.access_token.substring(0, 20)}...`}
											</div>
										</div>

										{/* Show refresh token if available */}
										{session.tokens.refresh_token && (
											<div className="bg-white p-3 rounded border">
												<div className="flex items-center justify-between mb-2">
													<span className="text-xs font-medium">
														🔄 Refresh Token:
													</span>
													<div className="flex gap-1">
														<Button
															onClick={() =>
																toggleTokenVisibility("refreshToken")
															}
															variant="ghost"
															size="sm"
														>
															{showTokens.refreshToken ? (
																<EyeOff className="h-3 w-3" />
															) : (
																<Eye className="h-3 w-3" />
															)}
														</Button>
														<Button
															onClick={() =>
																copyToClipboard(
																	session.tokens.refresh_token!,
																	"refreshToken",
																)
															}
															variant="ghost"
															size="sm"
														>
															{copied === "refreshToken" ? (
																<Check className="h-3 w-3" />
															) : (
																<Copy className="h-3 w-3" />
															)}
														</Button>
													</div>
												</div>
												<div className="bg-gray-100 p-2 rounded text-xs font-mono break-all max-h-20 overflow-y-auto">
													{showTokens.refreshToken
														? session.tokens.refresh_token
														: `${session.tokens.refresh_token!.substring(0, 20)}...`}
												</div>
												<p className="text-xs text-muted-foreground mt-2">
													💡 This token can be used to get new access tokens
													without requiring user login again
												</p>
											</div>
										)}

										<div className="grid grid-cols-2 gap-4 text-xs">
											<div className="bg-white p-3 rounded border">
												<p className="font-medium">
													Token Type:{" "}
													<Badge variant="outline">
														{session.tokens.token_type}
													</Badge>
												</p>
											</div>
											<div className="bg-white p-3 rounded border">
												<p className="font-medium">
													Expires:{" "}
													{TokenManager.formatTokenExpiry(session.tokens)}
												</p>
											</div>
										</div>
										<div className="bg-white p-3 rounded border">
											<p className="text-xs font-medium mb-1">
												🎯 Granted Scopes:
											</p>
											<div className="flex flex-wrap gap-1">
												{session.tokens.scope
													.split(" ")
													.filter(Boolean)
													.map((scope) => (
														<Badge
															key={scope}
															variant="secondary"
															className="text-xs"
														>
															{scope}
														</Badge>
													))}
											</div>
										</div>
									</div>
								)}
							</div>

							{/* Step 8: Client → Resource Server */}
							<div className="border rounded-lg p-4 bg-gradient-to-r from-red-50 to-red-100">
								<div className="flex items-center gap-4">
									<div className="h-8 w-8 rounded-full bg-red-600 flex items-center justify-center text-white text-xs font-semibold">
										8
									</div>
									<div className="flex-1">
										<p className="text-sm font-medium">
											🖥️ Client → 📊 Resource Server ({session.user.provider})
										</p>
										<p className="text-xs text-muted-foreground">
											Fetch user profile data with access token
										</p>
									</div>
									<Button
										variant="ghost"
										size="sm"
										onClick={() => toggleStep(8)}
									>
										{expandedSteps[8] ? (
											<ChevronDown className="h-4 w-4" />
										) : (
											<ChevronRight className="h-4 w-4" />
										)}
									</Button>
								</div>

								{expandedSteps[8] && (
									<div className="mt-4 pt-4 border-t space-y-3">
										<div className="bg-white p-3 rounded border">
											<p className="text-xs font-medium mb-2">
												📊 Resource Server API Call:
											</p>
											<div className="space-y-1 text-xs font-mono">
												<p>
													<strong>URL:</strong>{" "}
													{session.user.provider === "discord"
														? "https://discord.com/api/users/@me"
														: session.user.provider === "google"
															? "https://www.googleapis.com/oauth2/v2/userinfo"
															: "https://api.github.com/user"}
												</p>
												<p>
													<strong>Method:</strong> GET
												</p>
												<p>
													<strong>Authorization:</strong> Bearer{" "}
													{session.tokens.access_token.substring(0, 20)}...
												</p>
											</div>
										</div>
										<div className="grid grid-cols-2 gap-4">
											<div className="bg-white p-3 rounded border">
												<p className="text-xs font-medium">👤 User ID:</p>
												<p className="text-xs font-mono bg-gray-100 p-2 rounded mt-1">
													{session.user.id}
												</p>
											</div>
											<div className="bg-white p-3 rounded border">
												<p className="text-xs font-medium">📧 Name:</p>
												<p className="text-xs font-mono bg-gray-100 p-2 rounded mt-1">
													{session.user.name}
												</p>
											</div>
										</div>
										<div className="bg-white p-3 rounded border">
											<p className="text-xs font-medium">📧 Email:</p>
											<p className="text-xs font-mono bg-gray-100 p-2 rounded mt-1">
												{session.user.email}
											</p>
										</div>
										<div className="bg-white p-3 rounded border">
											<div className="flex items-center justify-between mb-2">
												<span className="text-xs font-medium">
													📄 Complete Profile Data:
												</span>
												<Button
													onClick={() =>
														copyToClipboard(
															JSON.stringify(session.user.raw_data, null, 2),
															"rawData",
														)
													}
													variant="ghost"
													size="sm"
												>
													{copied === "rawData" ? (
														<Check className="h-3 w-3" />
													) : (
														<Copy className="h-3 w-3" />
													)}
												</Button>
											</div>
											<div className="bg-gray-100 p-3 rounded">
												<pre className="text-xs overflow-auto max-h-40">
													{JSON.stringify(session.user.raw_data, null, 2)}
												</pre>
											</div>
										</div>
									</div>
								)}
							</div>

							{/* Final Status */}
							<div className="border rounded-lg p-4 bg-gradient-to-r from-gray-50 to-gray-100 border-gray-300">
								<div className="flex items-center gap-4">
									<div className="h-8 w-8 rounded-full bg-gray-600 flex items-center justify-center text-white text-xs font-semibold">
										✓
									</div>
									<div className="flex-1">
										<p className="text-sm font-medium">
											🎉 OAuth Flow Complete - Session Active
										</p>
										<p className="text-xs text-muted-foreground">
											All participants have successfully completed the OAuth 2.0
										</p>
									</div>
									<div className="flex gap-2">
										<Badge variant={isTokenExpired ? "destructive" : "default"}>
											{isTokenExpired ? "Expired" : "Active"}
										</Badge>
										<Button
											onClick={() => window.location.reload()}
											variant="ghost"
											size="sm"
											className="flex items-center gap-1"
										>
											<RotateCcw className="h-3 w-3" />
											Refresh
										</Button>
									</div>
								</div>
								<div className="mt-3 text-xs text-muted-foreground flex flex-wrap gap-4">
									<span>Duration: {sessionDuration}</span>
									<span>
										Token expires:{" "}
										{TokenManager.formatTokenExpiry(session.tokens)}
									</span>
									<span
										className={
											isClientSessionValid ? "text-green-600" : "text-red-600"
										}
									>
										Client Session:{" "}
										{isClientSessionValid ? "Active" : "Expired"}
										{clientSession &&
											` (${Math.round((clientSession.expires_at - Date.now()) / 1000 / 60)}m remaining)`}
									</span>
									<span className="font-medium text-blue-600">
										Verified via:{" "}
										{verificationMethod === "client-session"
											? "Client Session"
											: verificationMethod === "provider-check"
												? "Provider Check"
												: "Unknown"}
									</span>
									<span>Provider: {session.user.provider}</span>
									<span>User: {session.user.name}</span>
									{typeof window !== "undefined" && (
										<span>
											Client: {window.location.hostname}:
											{window.location.port || "80"}
										</span>
									)}
									<span>Scopes: {session.tokens.scope.split(" ").length}</span>
								</div>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}

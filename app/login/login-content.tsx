"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LoginButton } from "@/components/ui/login-button";
import { Shield, Loader2 } from "lucide-react";
import { tokenManager } from "@/lib/oauth/token-manager";

export function LoginContent() {
	const router = useRouter();
	const [isVerifying, setIsVerifying] = useState(true);

	useEffect(() => {
		const checkSession = async () => {
			setIsVerifying(true);

			// Get comprehensive verification status
			const verificationStatus =
				await tokenManager.getTokenVerificationStatus();

			if (verificationStatus.verified) {
				// Token is verified, redirect to dashboard
				router.replace("/dashboard");
				return;
			}

			setIsVerifying(false);
		};

		checkSession();
	}, [router]);

	if (isVerifying) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
				<div className="text-center space-y-4">
					<div className="inline-block p-3 bg-white rounded-full shadow-md">
						<Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
					</div>
					<p className="text-lg font-medium text-blue-800">
						Verifying session...
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4 sm:p-6 lg:p-8">
			<div className="w-full max-w-6xl space-y-8">
				{/* Header Section */}
				<div className="text-center space-y-4">
					<div className="flex flex-col sm:flex-row justify-center items-center gap-4">
						<div className="p-3 bg-blue-600 rounded-full">
							<Shield className="h-8 w-8 text-white" />
						</div>
						<h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent text-center sm:text-left">
							OAuth 2.0 Login System
						</h1>
					</div>
				</div>

				{/* OAuth Providers */}
				<div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
					<LoginButton provider="discord" />
					<LoginButton provider="github" />
					<LoginButton provider="google" />
				</div>
			</div>
		</div>
	);
}

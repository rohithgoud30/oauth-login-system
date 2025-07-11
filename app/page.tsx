"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { tokenManager } from "@/lib/oauth/token-manager";

export default function HomePage() {
	const router = useRouter();

	useEffect(() => {
		// Clear any existing session to ensure user logs in every time.
		tokenManager.clearSession();
		// Redirect to login page.
		router.replace("/login");
	}, [router]);

	// Show loading while checking session
	return (
		<div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-6">
			<div className="text-center space-y-4">
				<div className="inline-block p-3 bg-white rounded-full shadow-md">
					<div className="h-8 w-8 border-t-2 border-b-2 border-blue-600 rounded-full animate-spin"></div>
				</div>
				<p className="text-lg font-medium text-blue-800">Checking session...</p>
			</div>
		</div>
	);
}

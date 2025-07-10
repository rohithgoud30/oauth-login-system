"use client";

import { Button } from "./button";

interface InactivityTimeoutModalProps {
	isOpen: boolean;
	onStay: () => void;
	onLogout: () => void;
	countdown: number;
}

export function InactivityTimeoutModal({
	isOpen,
	onStay,
	onLogout,
	countdown,
}: InactivityTimeoutModalProps) {
	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
			<div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
				<h2 className="text-xl font-bold">Are you still there?</h2>
				<p className="text-gray-600 my-4">
					You will be logged out in <span className="font-bold">{countdown}</span> seconds due to inactivity.
				</p>
				<div className="flex justify-end gap-4">
					<Button variant="outline" onClick={onStay}>
						Stay Logged In
					</Button>
					<Button onClick={onLogout}>
						Logout Now
					</Button>
				</div>
			</div>
		</div>
	);
} 
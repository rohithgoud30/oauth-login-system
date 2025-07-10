import { useState, useEffect, useCallback, useRef } from "react";

interface UseInactivityTimeoutProps {
	timeout: number;
	onTimeout: () => void;
	onWarning: () => void;
}

export const useInactivityTimeout = ({
	timeout,
	onTimeout,
	onWarning,
}: UseInactivityTimeoutProps) => {
	const [isActive, setIsActive] = useState(true);
	const inactivityTimerRef = useRef<NodeJS.Timeout>();

	const resetTimer = useCallback(() => {
		setIsActive(true);
		if (inactivityTimerRef.current) {
			clearTimeout(inactivityTimerRef.current);
		}
		inactivityTimerRef.current = setTimeout(() => {
			onWarning(); // Trigger warning modal
		}, timeout - 60000); // Show warning 1 minute before timeout
	}, [onWarning, timeout]);

	const handleActivity = useCallback(() => {
		resetTimer();
	}, [resetTimer]);

	useEffect(() => {
		resetTimer();

		const events = ["mousemove", "mousedown", "keydown", "touchstart"];

		events.forEach((event) => window.addEventListener(event, handleActivity));

		return () => {
			if (inactivityTimerRef.current) {
				clearTimeout(inactivityTimerRef.current);
			}
			events.forEach((event) =>
				window.removeEventListener(event, handleActivity),
			);
		};
	}, [resetTimer, handleActivity]);

	return { isActive, resetTimer };
};

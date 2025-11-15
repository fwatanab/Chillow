import { useEffect, useState } from "react";

const DEFAULT_BREAKPOINT = 768;

export const useIsMobile = (breakpoint: number = DEFAULT_BREAKPOINT) => {
	const [isMobile, setIsMobile] = useState<boolean>(() => {
		if (typeof window === "undefined") return false;
		return window.innerWidth <= breakpoint;
	});

	useEffect(() => {
		if (typeof window === "undefined") {
			return;
		}
		const handler = () => setIsMobile(window.innerWidth <= breakpoint);
		window.addEventListener("resize", handler);
		return () => window.removeEventListener("resize", handler);
	}, [breakpoint]);

	return isMobile;
};

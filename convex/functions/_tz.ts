export function getEasternDayBounds(epochMs: number = Date.now()): { startMs: number; nextStartMs: number } {
	// Compute start of day and next start of day in America/New_York
	const tz = "America/New_York";
	// Extract ET date parts for the provided epoch
	const ymd = new Intl.DateTimeFormat("en-US", {
		timeZone: tz,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).formatToParts(epochMs);
	const year = Number(ymd.find(p => p.type === "year")!.value);
	const month = Number(ymd.find(p => p.type === "month")!.value);
	const day = Number(ymd.find(p => p.type === "day")!.value);

	// Helper to compute ET midnight for a given Y-M-D by anchoring to a UTC guess
	const midnightFor = (y: number, m: number, d: number): number => {
		// Start from a safe UTC hour (05:00 UTC usually maps to midnight ET in standard time)
		const guess = Date.UTC(y, m - 1, d, 5, 0, 0, 0);
		const hms = new Intl.DateTimeFormat("en-US", {
			timeZone: tz,
			hour12: false,
			hour: "2-digit",
			minute: "2-digit",
			second: "2-digit",
		}).formatToParts(guess);
		const hour = Number(hms.find(p => p.type === "hour")!.value);
		const minute = Number(hms.find(p => p.type === "minute")!.value);
		const second = Number(hms.find(p => p.type === "second")!.value);
		return guess - (((hour * 60 + minute) * 60 + second) * 1000);
	};

	const startMs = midnightFor(year, month, day);
	// Compute next day by letting Date.UTC handle overflow
	const nextStartMs = midnightFor(year, month, day + 1);
	return { startMs, nextStartMs };
}

export function getEasternStartOfDay(epochMs: number = Date.now()): number {
	return getEasternDayBounds(epochMs).startMs;
}

export function getEasternDateString(epochMs: number): string {
	const tz = "America/New_York";
	const parts = new Intl.DateTimeFormat("en-US", {
		timeZone: tz,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).formatToParts(epochMs);
	const y = parts.find(p => p.type === "year")!.value;
	const m = parts.find(p => p.type === "month")!.value;
	const d = parts.find(p => p.type === "day")!.value;
	return `${y}-${m}-${d}`;
}


export default function parseValue(raw: string | null) {
	if (raw === null) {
		return null;
	}

	const trimmed = raw.trim();
	if (trimmed === "") {
		return null;
	}

	const parsed = parseInt(trimmed, 10);
	if (Number.isNaN(parsed) || parsed < 0) {
		throw new Error("Expected a non-negative integer");
	}

	return parsed;
}

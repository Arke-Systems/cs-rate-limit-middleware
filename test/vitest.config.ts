import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		expect: { requireAssertions: true },
		include: ["../src/**/*.test.ts", "./**/*.test.ts"],
		root: "../",
	},
});

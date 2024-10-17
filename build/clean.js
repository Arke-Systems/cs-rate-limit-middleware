#!/usr/bin/env node

import { rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { styleText } from "node:util";
import { relative } from "node:path";

console.info(styleText(["bold", "underline"], "\nCleaning project..."));

for (const url of [new URL("../dist/", import.meta.url)]) {
	const path = fileURLToPath(url);
	const rel = relative(process.cwd(), path);
	console.info("Removing", styleText("yellowBright", rel));
	await rm(url, { force: true, recursive: true });
}

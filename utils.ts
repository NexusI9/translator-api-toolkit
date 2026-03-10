import fs from "fs/promises";
import path from "path";
import { INPUT_FOLDER, LOCALES, SOURCE_LANG } from "./constants";

/**
	Traverse a directory and subdir and return an array of all the JSON files
 */
export async function getJsonFiles(dir: string): Promise<string[]> {
	const entries = await fs.readdir(dir, { withFileTypes: true });

	const files: string[] = [];

	for (const entry of entries) {
		const fullPath = path.join(dir, entry.name);

		if (entry.isDirectory()) {
			files.push(...(await getJsonFiles(fullPath)));
		} else if (entry.name.endsWith(".json")) {
			files.push(fullPath);
		}
	}

	return files;
}


/**
		 Remove the locale prefix to the file path.
 */
export function trimPathLocale(fullpath: string) {
	return fullpath.replace(path.join(INPUT_FOLDER, SOURCE_LANG), "");
}


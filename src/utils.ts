import fs from "fs/promises";
import path from "path";

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



export async function getTargetPath(file: string, args: { input: string; output: string; locale: string }): Promise<string> {
	const inputPath = path.resolve(args.input);
	const filePath = path.resolve(file);
	const outputRoot = path.resolve(args.output);

	const inputStat = await fs.stat(inputPath);

	// If input is a directory, it is the locale root
	// If input is a file, its parent dir is the locale root
	const sourceLocaleRoot = inputStat.isDirectory()
		? inputPath
		: path.dirname(inputPath);

	const relativePath = path.relative(sourceLocaleRoot, filePath);

	return path.join(outputRoot, args.locale, relativePath);
}

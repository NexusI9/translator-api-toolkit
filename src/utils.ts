import fs from "fs/promises";
import path from "path";
import { ArgsManager } from "./args";
import { JSONProcessorSplitStringType } from "./json-processor";


/**
 * Traverse a directory and subdir and return an array of all the JSON files
 *
 * @param dir - The directory to traverse
 * @returns An array of string containing the files
 * 
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
 * Create the path for the target file 
 *
 * @param file - The input file to be processed
 * @param args.input - The input file or directory
 * @param args.output - The output directory used as the root
 * @param args.targetLocale - The locale used as parent folder name
 * @returns The path where the target/ translated file shall be output
 * 
 */
export async function getTargetPath(file: string, args: { input: string; output: string; targetLocale: string }): Promise<string> {
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

	return path.join(outputRoot, args.targetLocale, relativePath);
}


/**
 * Read a specific file. Create it if does not exists.
 *
 * @param filePath - The path of the file to read or create (usually the Target file)
 * @returns The parsed json if exist, empty object if newly created or undefined if unable to create.
 * 
 */
export async function readOrCreateFile(filePath: string) {

	let json: any = {};

	try {
		json = JSON.parse(await fs.readFile(filePath, "utf8"));
	} catch (err: any) {

		if (err.code === "ENOENT") {

			// File does not exist, create it
			await fs.mkdir(path.dirname(filePath), { recursive: true });
			await fs.writeFile(filePath, "{}");

			return {};
		}

		console.error(`Error while attempting to parse the file "${filePath}".`);
		return undefined;
	}

	return json;

}


/**
 * Create a delay
 * @description Used during API calls cause sometimes the API may send brandwidth error.
 * So we need a function to wait N seconds before sending the request again. 
 *
 * @param ms - The number of ms to wait
 * @returns the resolved timeout after the countdown is finished
 * 
 */
export function sleep(ms: number) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Returns the split string method according to arguments
 *
 * In arguments we can basically :
 *
 * 1. Not skip the string split process by not declaring any flag (default behavior),
 *    in which case the strings will be split by all type of punctuations (strong and weak)
 *
 * 2. Skipping entierly the string split sprocess with the flag -skip-split-str
 *
 * 3. Skipping split string only for weak punctuation with the flag -skip-split-str-weak,
 *    this will giver higher context to API for eventual better translation.
 *
 */
export function getSplitStringTypeFromArgs(args: ArgsManager): JSONProcessorSplitStringType {

	if (args.splitStringStrong && args.splitStringWeak)
		return "ALL";

	else if (args.splitStringStrong)
		return "STRONG"; // entierly skip split string process

	else if (args.splitStringWeak)
		return "WEAK"; // only split string according to strong punctuation

	return "NONE";

}

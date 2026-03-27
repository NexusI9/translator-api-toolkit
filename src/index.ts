import fs from "fs/promises";
import path from "path";
import {
	BATCH_SIZE,
	REGEXP_PROTECTED,
	REGEXP_VARIABLE,
	TRANSLATION_FILTERS,
} from "./constants";
import { Cache } from "./cache";
import { JSONProcessor, } from "./json-processor";
import { APIManager } from "./api/api-manager";
import { Logger } from "./logger";
import { Dico } from "./types";
import { getJsonFiles, getTargetPath, readOrCreateFile } from "./utils";
import { ArgsManager } from "./args";
import { Timer } from "./timer";

import dotenv from "dotenv";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";


const cache = new Cache();
const apiManager = new APIManager();
const jsonProcessor = new JSONProcessor();
const logger = new Logger();
const args = new ArgsManager();
const timer = new Timer();

dotenv.config();

/**
 * Filter out the (flattened) keys that already exists so we don't translate them twice.
 */
function prepareBatch(flatSource: Dico, flatTarget: Dico, cache?: Cache, override: Boolean = false) {

	const filteredSource = jsonProcessor.filter(flatSource, TRANSLATION_FILTERS);

	let missingKeys = Object.keys(filteredSource);

	// Remove already translated key (already existing in the target file)
	if (!override)
		missingKeys = Object.keys(filteredSource).filter((k) => {
			const value = flatTarget[k as keyof typeof flatTarget];
			return !value || typeof value === "string" && value.trim() === "";
		});

	const toTranslate: Dico = {};

	// Prepare the batching array by ensuring source text is not already cached.
	for (const key of missingKeys) {

		const value = filteredSource[key as keyof typeof filteredSource];

		// continue is exists in cache
		if (cache) {
			const cachedValue = cache.find(args.targetLocale, String(value));
			if (cachedValue) {
				flatTarget[key as keyof typeof flatTarget] = cachedValue;
				continue;
			}
		}

		const protectedText = typeof value === "string" ? jsonProcessor.protectVariables(value, [REGEXP_VARIABLE, REGEXP_PROTECTED]) : value;

		// add it th the batch list
		toTranslate[key] = protectedText;
	}

	return toTranslate;

}

async function translateBatch(
	{ toTranslate, flatTarget, cache, }:
		{ toTranslate: Dico, flatTarget: Dico, cache?: Cache }, args: ArgsManager) {

	const keys = Object.keys(toTranslate);
	for (let i = 0; i < keys.length; i += BATCH_SIZE) {

		const batchKeys = keys.slice(i, i + BATCH_SIZE);

		// get the batch of values to translate
		const batchValues = batchKeys.map(k => toTranslate[k]) as string[];

		// call API with batch of strings
		const translated = await apiManager.call(args.api, batchValues, args.targetLocale, args.maxChar);

		translated.forEach((t, index) => {
			const key = batchKeys[index];
			const sourceText = toTranslate[key];

			const restored = jsonProcessor.restoreVariables(t, index);
			flatTarget[key] = restored;

			if (cache)
				cache.insert(args.targetLocale, String(sourceText), restored);


			if (args.log)
				logger.push(args.targetLocale, String(sourceText), String(restored));
		});
	}


}

async function processLocale(file: string, args: ArgsManager) {

	console.log(`Processing file ${file}...`);

	if (!file.endsWith(".json"))
		console.error(`The provided file "${file}" needs to be a JSON. Skipping.`);


	const sourceJson = await readOrCreateFile(file);

	if (!sourceJson)
		return console.error(`Unable to read the source file: "${file}". Skipping.`);

	const flatSource = jsonProcessor.flatten(sourceJson);

	// Get target file and flatten it
	const targetPath = await getTargetPath(file, args);
	const targetJson = await readOrCreateFile(targetPath);

	if (!targetJson)
		return console.error(`Unable to read the target file: "${targetPath}". Skipping.`);

	const flatTarget = jsonProcessor.flatten(targetJson);

	if (!args.skipCache)
		await cache.load(args.targetLocale);

	const toTranslate = prepareBatch(flatSource, flatTarget, args.skipCache ? undefined : cache, args.override);

	await translateBatch({
		toTranslate,
		flatTarget,
		cache: args.skipCache ? undefined : cache,
	}, args);

	if (!args.skipCache)
		await cache.save(args.targetLocale);

	const rebuilt = jsonProcessor.unflatten(flatTarget);

	await fs.mkdir(path.dirname(targetPath), { recursive: true });
	await fs.writeFile(targetPath, JSON.stringify(rebuilt, null, 2));

	console.log(`Translated file ${targetPath}`);
}



async function main() {


	// Sanitize arguments and setup configuration
	args.decode();
	await args.validate();


	// Output configuration and ssk for confirmation before going on
	args.print();
	const rl = readline.createInterface({ input, output });
	const answer = await rl.question("Confirm? (y/n) ");
	rl.close();
	if (answer.toLowerCase() === "n")
		return console.log("Cancelled. Exiting program...");


	timer.start();
	{
		// Translate
		const inputType = await args.getInputType();
		switch (inputType) {

			case "FILE":
				await processLocale(args.input, args);
				break;

			case "DIR":
				const files = await getJsonFiles(args.input);
				for (const file of files)
					await processLocale(file, args);
				break;
		}
	}
	const time = timer.end();

	// Write Logs
	if (args.log) {

		logger.setApiMethod(args.api);
		logger.setElapsedTime(time);
		await logger.write();
		await logger.writeCSV();

	}

	console.log('------------------------------------------');
	console.log(`Total characters translated: ${logger.charactersCount} (${time}ms)`);
	if (!args.skipCache)
		console.log(`Cache was hit ${cache.stat.hit} times and saved ${cache.stat.characters} characters`);
}

main();

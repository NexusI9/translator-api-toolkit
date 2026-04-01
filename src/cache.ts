import path from "path";
import fs from "fs/promises";

import { CACHE_FOLDER, REGEXP_PUNCTUATION } from "./constants";
import { readOrCreateFile } from "./utils";

/**
|--------------------------------------------------
| Cache
|
| Dictionnary that store translation session
| strings chunks.
| Used as a look-up table during the translation
| process to prevent sending twice the same chunk
| to the API, saving characters usage.
|
|--------------------------------------------------
 */
export class Cache {

	// Main dictionary storage
	catalog: Record<string, Record<string, string>> = {};

	// Keep record of cache hit, mostly use for logging purpose
	#hit: Record<string, string> = {};

	/**
	 * Load cache file from given locale
	 *
	 * @param locale - the locale to load the file from (en-US => load "cache/en-US.json") 
	 *
	 */
	async load(locale: string) {
		const file = path.join(CACHE_FOLDER, `${locale}.json`);
		this.catalog[locale] = await readOrCreateFile(file);
	}

	/**
	 * Sanitize caches key by removing punctuations
	 *
	 * @param value - the key to sanitize
	 * @returns the punctuation-less value
	 *
	 */
	private sanitize(value: string) {
		// 2. remove punctuation
		value = value.replace(REGEXP_PUNCTUATION, "");
		return value;
	}

	/**
	 * Insert a translated value into the given key (source string)
	 *
	 * @param locale - the target locale translated into
	 * @param key - the original untranslated string
	 * @param value - the translated string
	 *
	 */
	insert(locale: string, key: string, value: string) {
		this.catalog[locale][this.sanitize(key)] = value;
	}

	/**
	 * Find a translated value according to a locale and string
	 *
	 * @param locale - the target locale translated into
	 * @param key - the string used as key
	 *
	 * @returns null if not found, else string value
	 *
	 */
	find(locale: string, key: string): string | null {
		const found = this.catalog[locale][this.sanitize(key)];

		if (found)
			this.#hit[key] = found;

		return found;
	}

	/**
	 * Save the cache dictionary into a file 
	 * @description Used after the translation is done to store the session's cached translation
	 * from the provided locale.
	 *
	 * @param locale - The target locale cache file to save to (will overwrite if existing). 
	 * 
	 */
	async save(locale: string) {
		await fs.mkdir(CACHE_FOLDER, { recursive: true });
		const file = path.join(CACHE_FOLDER, `${locale}.json`);
		await fs.writeFile(file, JSON.stringify(this.catalog[locale], null, 2));
	}

	/**
	 * Compute statistics from the current session cache usage.
	 * @description Returns various usefull data from the caching session
	 * such as the sum of the characters from the cache hit.
	 * This allows to know how many characters we saved during a session.
	 * 
	 * @returns an object with data from the cache session:
	 * - hit: the number of time the cache was hit and prevented an API call
	 * - characters: the number of characters read from the cache,
	 * allowing to know how much character we saved.
	 *
	 */
	get stat() {
		let characters = 0;
		Object.keys(this.#hit).forEach(key => characters += this.#hit[key].length);
		return {
			hit: Object.keys(this.#hit).length,
			characters
		};
	}
}



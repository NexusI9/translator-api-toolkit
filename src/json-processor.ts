import {
	KEY_SPLIT_LEVEL,
	KEY_SPLIT_STRING,
	LOCALES,
	REGEX_STRING_INDEX,
	REGEXP_PROTECTED,
	REGEXP_SPLIT_STRONG_PUNCTUATION,
	REGEXP_SPLIT_WEAK_PUNCTUATION,
	REGEXP_VARIABLE,
	SPLIT_COMMA_LENGTH_LIMIT,
	SPLIT_STRING_MIN_LENGTH,
	TRANSLATION_FILTERS
} from "./constants";
import { Dico, RecordFilter } from "./types";
import { Cache } from "src/cache";

export const JSON_PROCESSOR_NO_PREFIX = "";

export type JSONProcessorSplitStringType = "NONE" | "ALL" | "STRONG" | "WEAK";

export class JSONProcessor {

	// Cache to store the protected strings variables
	varsMap: string[][] = [];

	/**
	 * Split string from different puncuation pattern
	 * @description In arguments we can choose between 3 kinds of string splitting methdods :
	 * String splitting is required to prevent sending huge chunk of text to the api, instead
	 * we can split the paragraph either via strong punctuation (. ! ?), weak punctuation (, : ;).
	 * Although weak punctuation provide a better cache usage with smaller chunks of text,
	 * it may lead to loss of context, so we still give the option to only split by strong punctuation 
	 * in case weak-splitting leads to too much granularity and harm API output quality.
	 *
	 * [26/03/31] After testing, splitting fron strong + weak puncuation harms too much the translation result.
	 * As a result it's been decided only keep the strong split punctuation as default as it provide a nice
	 * Balance between cache reuasibility and translation quality.
	 *
	 * @param text - The string to segment
	 * @param type - The type of punctuation to split from:
	 * - STRONG includes ! . ?
	 * - WEAK includes , : ; 
	 * @returns The array of split string
	 * 
	 */
	#splitString(
		text: string,
		type: JSONProcessorSplitStringType = "NONE"
	): string[] {

		if (type === "NONE") return [text];

		let segments: string[] = [text];

		// Strong punctuation
		if (type === "STRONG" || type === "ALL") {
			segments = segments.flatMap(seg => seg.split(REGEXP_SPLIT_STRONG_PUNCTUATION));
		}

		// Weak punctuation
		if (type === "WEAK" || type === "ALL") {
			segments = segments.flatMap(seg => {
				// Only split by weak punctuation if the segment is long
				if (seg.length > SPLIT_COMMA_LENGTH_LIMIT) {
					return seg.split(REGEXP_SPLIT_WEAK_PUNCTUATION);
				}
				return [seg];
			});
		}

		// Clean up
		return segments.map(s => s.trim()).filter(Boolean);
	}


	/**
	 * Flatten the json structure into a 1 level object, easier to traverse for translation
	 * @description A: { B: { C: {} }}   ==>   ["A/B/C"]: 
	 * Flattening the JSON allows to standardize de overall data structure by simply working
	 * with a 1 level structure and ensure:
	 * - Easier batching
	 * - Cache checking
	 * - Faster to check in the target file the key is missing of not.
	 * 
	 * The json is then rebuilt in the unflaten method.
	 *
	 * We also split strings by punctuation for better cache usage with smaller chunks
	 * Overall Synthax:
	 *
	 * 1. Object levels are speratated by /
	 *      A: { B: "Value" }         ==>  ["A/B"]: "Value"
	 *
	 * 2. Strings are segmented by #
	 *      A: { B: "Start. End." }   ==>  ["A/B#0"]: "Start."
	 *                                     ["A/B#1"]: "End."
	 *
	 * @param obj - Any JSON structured like dictionary to flatten
	 * @param prefix - A string to prepend to all generated key
	 * @param splitStringType - The method used to split string 
	 * @param res - The referene to the flattened object 
	 * @returns The flattened to 1 level object
	 * 
	 */
	flatten(obj: any, prefix = JSON_PROCESSOR_NO_PREFIX, splitStringType: JSONProcessorSplitStringType = "NONE", res: Dico = {}) {

		for (const key in obj) {
			const value = obj[key];
			const newKey = prefix ? [prefix, key].join(KEY_SPLIT_LEVEL) : key;

			if (value && typeof value === "object") {

				this.flatten(value, newKey, splitStringType, res);

			} else if (value && typeof value == "string" && splitStringType != "NONE") {

				// Avoid splitting short string
				if (value.length < SPLIT_STRING_MIN_LENGTH) {
					res[newKey] = value;
					continue;
				}

				const segments = this.#splitString(value, splitStringType);

				if (segments.length === 1) {
					res[newKey] = value;
				} else {
					segments.forEach((segment, i) => {
						res[[newKey, i].join(KEY_SPLIT_STRING)] = segment;
					});
				}

			} else {
				// split string ?
				res[newKey] = value;
			}

		}

		return res;
	}

	/**
	 * Rebuild the flattened json after translation processed:
	 * @description  ["A/B/C"]: 99   ==>   A: { B: { C: 99 }}
	 *
	 * @param obj - The flattened object
	 * @returns The restructured object
	 * 
	 */
	#rebuildObjects(obj: Dico) {
		const result: any = {};

		for (const key in obj) {
			const keys = key.split(KEY_SPLIT_LEVEL);
			let current = result;

			keys.forEach((k, i) => {
				const isLast = i === keys.length - 1;
				const nextKey = keys[i + 1];

				const useArray = !isLast && /^\d+$/.test(nextKey);

				if (isLast) {
					current[k] = obj[key];
				} else {
					if (current[k] === undefined) {
						current[k] = useArray ? [] : {};
					}
					current = current[k];
				}
			});
		}

		return this.convertNumericObjectsToArrays(result);
	}

	/**
	 * Concant and rebuild the flattened strings.
	 * @description: ["A/B/#0"]: "Part A." 
	 *               ["A/B/#1"]: "Part B."
	 *                ==> "Part A. Part B."
	 *
	 * @param obj - The flattened object
	 * @returns The object where string are now merged
	 * 
	 */
	private rebuildStrings(obj: Dico) {
		const merged: Record<string, any> = {};

		for (const key in obj) {
			const match = key.match(REGEX_STRING_INDEX);

			if (match) {
				const base = match[1];
				const index = Number(match[2]);

				if (!merged[base]) merged[base] = [];
				merged[base][index] = obj[key];
			} else {
				merged[key] = obj[key];
			}
		}

		// join segmented strings
		for (const key in merged) {
			if (Array.isArray(merged[key])) {
				merged[key] = merged[key].join(" ");
			}
		}

		return merged;
	}

	/**
	 * Convenience function that queue necessary methods to properly unflatten the object. 
	 *
	 * @param obj - The flattened object.
	 * @returns The unflatted object
	 * 
	 */
	unflatten(obj: Dico) {
		const mergedStrings = this.rebuildStrings(obj);
		return this.#rebuildObjects(mergedStrings);
	}

	/**
	 * Recursively convert objects with numeric keys into arrays
	 * @description Common use case
	 *
	 * @param obj - The flattened object
	 * @returns The restructured object
	 * 
	 */
	private convertNumericObjectsToArrays(obj: any): any {
		if (obj && typeof obj === "object") {
			const keys = Object.keys(obj);
			// Check if all keys are numeric → convert to array
			if (keys.length > 0 && keys.every(k => /^\d+$/.test(k))) {
				const arr = keys
					.sort((a, b) => Number(a) - Number(b))
					.map(k => this.convertNumericObjectsToArrays(obj[k]));
				return arr;
			} else {
				for (const key in obj) {
					obj[key] = this.convertNumericObjectsToArrays(obj[key]);
				}
			}
		}
		return obj;
	}

	/**
	 * Protect variables in a string using multiple regex patterns.
	 * @description Replaces matches with placeholders (__VAR_0__, __VAR_1__, ...).
	 * This ensures translator provider doesn't translate those protected value.
	 * The values are cache in the varMap variable and restitued after translation done.
	 *
	 * @param text - The string to analyse
	 * @param patterns - A list of regexp to define how the variables shall be matche
	 * @returns The text with variables replaced by plaholders
	 * 
	 */
	protectVariables(text: string, patterns: RegExp[]): string {
		const vars: string[] = [];
		let i = 0;

		let protectedText = text;

		// Apply each regex in sequence
		for (const regexp of patterns) {
			protectedText = protectedText.replace(regexp, (match) => {
				// Skip duplicate matches already replaced
				if (!vars.includes(match)) {
					vars.push(match);
					// TODO: make the variable generator a function
					return `_V${i++}_`;
				}
				return match;
			});
		}

		this.varsMap.push(vars);

		return protectedText;
	}


	/**
	 * Restore the cached variables based on their index.
	 *
	 * @param text - The value to analyse
	 * @param text - The index to look up in the varMap array to get the stored variables at this index 
	 * @returns The string with the restored variables
	 * 
	 */
	restoreVariables(text: string, keyIndex: number) {
		let restored = text;

		this.varsMap[keyIndex].forEach((v, i) => {
			restored = restored.replace(`_V${i}_`, v);
		});

		return restored;
	}

	/**
	 * Filter out the json object according to an set of filter configuration.
	 * @description Filters are fully configurable and can target either the key or the value it self.
	 * We use a discriminator system by either filtering by PRESET with perset commands
	 * or by using specific REGEXP. 
	 *
	 * @param obj - The JSON object to filter
	 * @param rules - The array of filters
	 * @returns The filtered json object.
	 * 
	 */
	filter(obj: Dico, rules: RecordFilter[]): Dico {
		const result: Dico = {};

		for (const [key, value] of Object.entries(obj)) {
			let skip = false;

			for (const { type, rule, target } of rules) {
				const tg = target === "KEY" ? key : value;

				switch (type) {
					case "PRESET":
						if (rule === "FILTER_NUMBER" && typeof tg !== "string") skip = true;
						if (rule === "FILTER_EMPTY_STRING" && typeof tg === "string" && !tg.length) skip = true;
						break;

					case "REGEXP":
						if (typeof tg === "string" && rule.test(tg)) skip = true;
						break;

					//TODO: test below rule discriminator (LIST)
					case "LIST":
						if (typeof tg === "string" && rule.includes(tg)) skip = true;
						break;
				}

				if (skip) break; // stop evaluating more rules if one matched
			}

			if (!skip) {
				result[key] = value;
			}
		}

		return result;
	}


	/**
	 * Filters out from the source object the already existing key in the target object
	 * @description By filtering out existing key, we ensure to only translate the new
	 * keys from the source object.
	 *
	 * @param source - The source dictionnary
	 * @param target - The target dictionnary to compare to
	 * @returns An array of string containing the missing keys
	 * 
	 */
	#getMissingKeys(source: Dico, target: Dico): string[] {

		// Remove already translated key (already existing in the target file)
		let missingKeys = Object.keys(source).filter((k) => {
			const value = target[k as keyof typeof target];
			return !value || typeof value === "string" && value.trim() === "";
		});

		return missingKeys;
	}

	/**
	 * Optimize and clear doublons out the the source dictionary
	 * @description Compare source dictionary with other data structure like cache or the target file
	 * And according to the configuration it will eventually remove already translated string from the cache
	 * or from the destination/ target dictionary.
	 *
	 * @param source - The source dictionary to translate from
	 * @param target - The target dictionary to translate to
	 * @param locale - The target locale to translate to (for now the program assume en-US as default source locale)
	 * @param cache - The cached dictionary to check if a value is already translated
	 * @param override - If true, it won't get the missing keys and will include all the values no matter if they already
	 * exists in the target file. Else it will filter out the existing key from the target file.
	 * @returns The filtered dictionary ready to be translated
	 * 
	 */
	removeDoublon(source: Dico, target: Dico, locale: keyof typeof LOCALES, cache?: Cache, override: Boolean = false) {

		const filteredSource: Dico = this.filter(source, TRANSLATION_FILTERS);
		let keysToTranslate = Object.keys(filteredSource); // by default, all keys

		// if no override option, only keep missing keys in the target file
		if (!override)
			keysToTranslate = this.#getMissingKeys(filteredSource, target);


		const toTranslate: Dico = {};

		// Prepare the batching array by ensuring source text is not already cached.
		for (const key of keysToTranslate) {

			const value = filteredSource[key as keyof typeof filteredSource];

			// continue is exists in cache
			if (cache) {
				const cachedValue = cache.find(locale, String(value));
				if (cachedValue) {
					target[key as keyof typeof target] = cachedValue;
					continue;
				}
			}

			const protectedText = typeof value === "string" ? this.protectVariables(value, [REGEXP_VARIABLE, REGEXP_PROTECTED]) : value;

			// add it th the batch list
			toTranslate[key] = protectedText;
		}

		return toTranslate;

	}



}



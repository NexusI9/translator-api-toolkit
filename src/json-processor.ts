import {
	KEY_SPLIT_LEVEL,
	KEY_SPLIT_STRING,
	REGEX_STRING_INDEX,
	REGEXP_SPLIT_STRONG_PUNCTUATION,
	REGEXP_SPLIT_WEAK_PUNCTUATION,
	SPLIT_COMMA_LENGTH_LIMIT,
	SPLIT_STRING_MIN_LENGTH
} from "./constants";
import { Dico, RecordFilter } from "./types";

export const JSON_PROCESSOR_NO_PREFIX = "";

export type JSONProcessorSplitStringType = "NONE" | "ALL" | "STRONG" | "WEAK";

export class JSONProcessor {

	varsMap: string[][] = [];


	/**
	 * In arguments we can choose between 3 kinds of string splitting methdods :
	 * String splitting is required to prevent sending huge chunk of text to the api, instead
	 * we split the paragraph either via strong punctuation (. ! ?), weak punctuation (, : ;).
	 * Although weak punctuation provide a better cache usage with smaller chunks of text,
	 * it may lead to loss of context, so we still give the option to only split by strong punctuation 
	 * in case weak-splitting leads to too much granularity and harm API output quality. 
	 *
	 * 1. Not skip the string split process by not declaring any flag (default behavior),
	 *    in which case the strings will be split by all type of punctuations (strong and weak)
	 *
	 * 2. Skipping entierly the string split sprocess with the flag -skip-split-str
	 *
	 * 3. Skipping split string only for weak punctuation with the flag -skip-split-str-weak,
	 *    this will giver higher context to API for eventual better translation.
	 */
	private splitString(
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
	 * Flatten the json structure:
	 *
	 *     A: { B: { C: {} }}   ==>   ["A/B/C"]: 
	 *
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
	 *
	 */
	flatten(obj: any, prefix = JSON_PROCESSOR_NO_PREFIX, splitStringType: JSONProcessorSplitStringType = "NONE", res: Record<string, string | number> = {}) {

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

				const segments = this.splitString(value, splitStringType);

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
	 * 
	 * Rebuild the flattened json after translation processed:
	 * 
	 *        ["A.B.C"]   ==>   A: { B: { C: {} }}
	 *
	 */
	private rebuildObjects(obj: Dico) {
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
	 * 
	 * Concant and rebuild the flattened strings:
	 * 
	 *        ["A/B/#0"]: "Part A." 
	 *        ["A/B/#1"]: "Part B."
	 *        ==> "Part A. Part B."
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

	unflatten(obj: Dico) {
		const mergedStrings = this.rebuildStrings(obj);
		return this.rebuildObjects(mergedStrings);
	}

	/**
	 * Recursively convert objects with numeric keys into arrays
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
	 * Replaces matches with placeholders (__VAR_0__, __VAR_1__, ...).
	 */
	protectVariables(text: string, regexps: RegExp[]): string {
		const vars: string[] = [];
		let i = 0;

		let protectedText = text;

		// Apply each regex in sequence
		for (const regexp of regexps) {
			protectedText = protectedText.replace(regexp, (match) => {
				// Skip duplicate matches already replaced
				if (!vars.includes(match)) {
					vars.push(match);
					return `__VAR_${i++}__`;
				}
				return match;
			});
		}

		this.varsMap.push(vars);

		return protectedText;
	}

	/**
	 * Restore the cached variables based on their index.
	 */
	restoreVariables(text: string, keyIndex: number) {
		let restored = text;

		this.varsMap[keyIndex].forEach((v, i) => {
			restored = restored.replace(`__VAR_${i}__`, v);
		});

		return restored;
	}


	/**
	 * Filter out the json object according to an array of filter.
	 * Filters are fully configurable and can target either the key or the value it self.
	 * We use a discriminator system by either filtering by PRESET with perset commands
	 * or by using specific REGEXP 
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
				}

				if (skip) break; // stop evaluating more rules if one matched
			}

			if (!skip) {
				result[key] = value;
			}
		}

		return result;
	}


}



import { KEY_SPLIT_CHAR } from "./constants";
import fs from "fs/promises";
import path from "path";
import { Dico, RecordFilter } from "./types";

export class JSONProcessor {

	varsMap: string[][] = [];

	/**
		 Read a specific file in a given locale. Return undefined if not found.
	 */
	async readOrCreate(filename: string) {

		let json: any = {};

		try {
			json = JSON.parse(await fs.readFile(filename, "utf8"));
		} catch (err: any) {

			if (err.code === "ENOENT") {

				// File does not exist, create it
				await fs.mkdir(path.dirname(filename), { recursive: true });
				await fs.writeFile(filename, "{}");

				return {};
			}

			console.error(`Error while attempting to parse the file "${filename}".`);
			return undefined;
		}

		return json;

	}

	/**
	Flatten the json structure:

							 A: { B: { C: {} }}   ==>   ["A.B.C"]: 
 
	Flattening the JSON allows to standardize de overall data structure by simply working with a 1 level structure and ensure:
	- Easier batching
	- Cache checking
	- Faster to check in the target file the key is missing of not.
	
	The json is then rebuilt in the unflaten method.
	 */
	flatten(obj: any, prefix = "", res: Record<string, string | number> = {}) {
		for (const key in obj) {
			const value = obj[key];
			const newKey = prefix ? `${prefix}${KEY_SPLIT_CHAR}${key}` : key;

			if (value && typeof value === "object")
				this.flatten(value, newKey, res);
			else
				res[newKey] = value;

		}

		return res;
	}

	/**
  
	Rebuild the flattened json after translation processed:
	
				 ["A.B.C"]   ==>   A: { B: { C: {} }}
	
	 */
	unflatten(obj: Dico) {
		const result: any = {};

		for (const key in obj) {
			const keys = key.split(KEY_SPLIT_CHAR);
			let current = result;

			keys.forEach((k, i) => {
				const isLast = i === keys.length - 1;
				const nextKey = keys[i + 1];

				// Detect if nextKey is a number => create array
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
	Restore the cached variables based on their index.
	 */
	restoreVariables(text: string, keyIndex: number) {
		let restored = text;

		this.varsMap[keyIndex].forEach((v, i) => {
			restored = restored.replace(`__VAR_${i}__`, v);
		});

		return restored;
	}


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



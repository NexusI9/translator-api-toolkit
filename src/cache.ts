import path from "path";
import fs from "fs/promises";

import { CACHE_FOLDER } from "./constants";
import { readOrCreateFile } from "./utils";
import { Dico } from "./types";

export class Cache {

	catalog: Record<string, Record<string, string>> = {};
	#hit: Record<string, string> = {};

	async load(locale: string) {
		const file = path.join(CACHE_FOLDER, `${locale}.json`);
		this.catalog[locale] = await readOrCreateFile(file);
	}

	insert(locale: string, key: string, value: string) {

		console.log(value);
		this.catalog[locale][key] = value;
	}

	find(locale: string, key: string): string | null {
		const found = this.catalog[locale][key];

		if (found)
			this.#hit[key] = found;

		return found;
	}

	async save(locale: string) {
		await fs.mkdir(CACHE_FOLDER, { recursive: true });
		const file = path.join(CACHE_FOLDER, `${locale}.json`);
		await fs.writeFile(file, JSON.stringify(this.catalog[locale], null, 2));
	}

	/**
	 * Returns various usefull data from the caching session such as the sum of the characters from the cache hit.
	 * This allows to know how many characters we saved during a session
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



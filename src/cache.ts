import path from "path";
import fs from "fs/promises";

import { CACHE_FOLDER } from "./constants";

export class Cache {

	async load(locale: string) {
		const file = path.join(CACHE_FOLDER, `${locale}.json`);

		try {
			return JSON.parse(await fs.readFile(file, "utf8"));
		} catch {
			return {};
		}
	}

	async save(locale: string, cache: any) {
		await fs.mkdir(CACHE_FOLDER, { recursive: true });

		const file = path.join(CACHE_FOLDER, `${locale}.json`);

		await fs.writeFile(file, JSON.stringify(cache, null, 2));
	}
}



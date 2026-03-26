import { Method } from "../types";
import { Gemini } from "./gemini";
import { LibreTranslate } from "./libre-translate";
import { Deepl } from "./deepl";

export class APIManager {

	#characterCount = 0;

	cutByCharacterLimit(
		items: string[],
		characterCount: number,
		characterLimit: number
	): string[] {

		const result: string[] = [];
		let count = characterCount;

		for (const word of items) {
			const length = word.length;

			if (count + length > characterLimit) {
				break;
			}

			result.push(word);
			count += length;
		}

		return result;
	}

	async call(method: Method, strings: string[], locale: string, characterLimit: number = 0): Promise<string[]> {

		if (characterLimit)
			strings = this.cutByCharacterLimit(strings, this.#characterCount, characterLimit);

		let result;
		switch (method) {

			case "GEMINI":
				result = await Gemini(locale, strings);
				break;

			case "GOOGLE_CLOUD":
				result = strings;
				break;

			case "DEEPL":
				result = await Deepl(locale, strings);
				break;


			case "LIBRE_TRANSLATE":
				result = await LibreTranslate(locale, strings);
				break;

			case "UNDEFINED":
			default:
				throw new Error("No valid translation API methods were defined, make sure to use the --api=METHOD argument.");

		}

		strings.forEach(string => this.#characterCount += string.length);
		return result;

	}

}


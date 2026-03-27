import { APIMethodFn, Method } from "../types";

// Loading APIs Methods
import { Gemini } from "./gemini";
import { LibreTranslate } from "./libre-translate";
import { Deepl } from "./deepl";
import { GoogleCloud } from "./google-cloud";

const METHOD_CALLBACK_UNDEFINED: APIMethodFn = async (_locale, _strings, _attempt) => {
	throw new Error("No valid translation API methods were defined, make sure to use the --api=METHOD argument.");
}

const METHOD_CALLBACKS: Record<Method, APIMethodFn> = {
	"UNDEFINED": METHOD_CALLBACK_UNDEFINED,
	"DEEPL": Deepl,
	"GEMINI": Gemini,
	"GOOGLE_CLOUD": GoogleCloud,
	"LIBRE_TRANSLATE": LibreTranslate,
};

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

		const callback = METHOD_CALLBACKS[method];

		// if arguement method is invalid and no mapped callback found, then set it as UNDEFINED and throw error
		if (!callback)
			method = "UNDEFINED";

		let result = await METHOD_CALLBACKS[method](locale, strings);

		strings.forEach(string => this.#characterCount += string.length);
		return result;

	}

}


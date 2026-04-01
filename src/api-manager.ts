import { APIMethodFn, Method } from "./types";

// Loading APIs Methods
import { Gemini } from "./api/gemini";
import { LibreTranslate } from "./api/libre-translate";
import { Deepl } from "./api/deepl";
import { GoogleCloud } from "./api/google-cloud";

/**
 * Fallback Function for API call 
 * @description Used when mapping the API argument method with specific callback.
 *
 * @param _locale - (unsued) The target locale to translate to  
 * @param _strings - (unsued) The strings to translate
 * @param _attempts - (unsued) The number of translation attempt in case API sends error
 * @exception By default, throws new error since calling this function means using a non handled API.
 * 
 */
const METHOD_CALLBACK_UNDEFINED: APIMethodFn = async (_locale, _strings, _attempt) => {
	throw new Error("No valid translation API methods were defined, make sure to use the --api=METHOD argument.");
}

/**
 * Map the Method from command like to per-service callbacks
 */
const METHOD_CALLBACKS: Record<Method, APIMethodFn> = {
	"UNDEFINED": METHOD_CALLBACK_UNDEFINED,
	"DEEPL": Deepl,
	"GEMINI": Gemini,
	"GOOGLE_CLOUD": GoogleCloud,
	"LIBRE_TRANSLATE": LibreTranslate,
};

/**
|--------------------------------------------------
| APIManager
|
| Responsible for handling the overall API request
| flow by dispatching and calling the right
| provider callback according to the set API
| method.
|
|--------------------------------------------------
 */
export class APIManager {

	// The number of translated character used during the session.
	// Mostly used to make sure we do not go over the character limit.
	#characterCount = 0;

	/**
	 * Trim the current batch according to the provided character limit 
	 * @description Used before each API call, this acts as a guardrail making
	 * sure we do not overflow the number of max character allows. 
	 *
	 * @param items - The array of string to eventually truncate
	 * @param characterCount - The number of translated character for the current session 
	 * @param characterLimit - The maximum character allowed to be translated
	 * @returns Truncated string
	 * 
	 */
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

	/**
	 * Dispatch and call the API callback according to the given method. 
	 * @description Called for each batch. Usually we will send batch to the server
	 * which are simply array of strings that are STRINGIFIED.
	 * The providers (NMT as well as LLM) seem to both handle pretty well this format.
	 *
	 * @param method - The provider to use to translate (GOOGLE_CLOUD, DEEPL...)
	 * @param strings - The array of string sent to the translation server
	 * @param locale - The target locale to translate to, will be passed to the prompt or as request argument
	 * @param characterLimit - The maximum number of characters allowed to send to the API to prevent quota overflow
	 * @returns The translated array of string
	 * 
	 */
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


import { Method } from "../types";

export class APIManager {

	#characterCount = 0;

	async call(method: Method, strings: string[], locale: string, characterLimit: number = 0): Promise<string[]> {

		switch (method) {

			case "GEMINI":

				const prompt = `
Translate the following UI strings from English to ${locale}.
Return ONLY a JSON array in the same order.

${JSON.stringify(strings)}
`;

				// TODO: replace with real API call
				console.log("Calling Gemini...");
				return strings.map((s) => `[${locale}] ${s}`);

			case "GOOGLE_TRANSLATE":
				// TODO: replace with real API call
				console.log("Calling Google Translate...");
				return strings.map((s) => `[${locale}] ${s}`);

		}


		return strings;

	}

}


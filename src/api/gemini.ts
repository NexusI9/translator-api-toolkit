import { sleep } from "src/utils";

const SLEEP_TIME = 15000;
const MAX_ATTEMPT = 5;
const ERROR_CODE_UNAVAILABLE = 503;
const ERROR_CODE_EXPIRED_QUOTA = 429;

export async function Gemini(locale: string, strings: string[], attempt: number = 1): Promise<string[]> {

	if (!process.env.GEMINI_API_KEY)
		throw new Error("Unable to find Gemini API Key");


	const prompt = `
Translate the following UI strings from English to ${locale}.
Return ONLY the translated words in an array. Do NOT add any markdown. Just use a simple linear format like ["word1", "word2",...].

${JSON.stringify(strings)}
`;


	const response = await fetch(
		"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
		{
			method: "POST",
			headers: {
				"x-goog-api-key": process.env.GEMINI_API_KEY,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				contents: [
					{
						parts: [
							{
								text: prompt,
							},
						],
					},
				],
			}),
		}
	);

	if (!response.ok) {
		const errorText = await response.text();
		console.warn(`HTTP ${response.status}: ${errorText} `);

		if (attempt >= MAX_ATTEMPT)
			throw new Error("Gemini failed after 5 retries");


		if (JSON.parse(errorText).error.code == ERROR_CODE_UNAVAILABLE) {
			console.log(`Retrying in ${(SLEEP_TIME / 1000)} seconds...`);
			await sleep(SLEEP_TIME);
			return Gemini(locale, strings, attempt++);
		}

	}

	const data = await response.json();
	//TODO only print if verbose activated console.log(JSON.stringify(data, null, 2));

	const text =
		data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text);

	// DELETEME
	console.log("\nGenerated text:\n", text.join("") ?? "");

	try {
		return JSON.parse(text);
	} catch (err) {
		throw new Error(`Failed to parse JSON from Gemini response: ${err}`);
	}

}

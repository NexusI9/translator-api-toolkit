import * as deepl from 'deepl-node';
import { LOCALES } from 'src/constants';


// See: https://developers.deepl.com/docs/getting-started/supported-languages
const DEEPL_LOCALES_MAP: Partial<Record<keyof typeof LOCALES, deepl.TargetLanguageCode>> = {
	"en-US": "en-US",
	"en-GB": "en-GB",
	"en-CA": "en-US",
	"en-AU": "en-US",
	"fr-FR": "fr",
	"fr-CA": "fr",
	"zh-TW": "zh-HANT",
};



export async function Deepl(locale: string, strings: string[], attempt: number = 1): Promise<string[]> {

	if (!process.env.DEEPL_API_KEY)
		throw new Error("Unable to find DeepL API Key, make sure you've set up DEEPL_API_KEY in the environment file.");


	let targetLocale = DEEPL_LOCALES_MAP[locale as keyof typeof DEEPL_LOCALES_MAP];

	if (!targetLocale)
		throw new Error("Target language not supported by DeepL API.");

	const deeplClient = new deepl.DeepLClient(process.env.DEEPL_API_KEY);


	const content = JSON.stringify(strings.join("\n"));

	const result = await deeplClient.translateText(content, null, targetLocale);

	console.log(result.text);

	return result.text.split("\n");
}

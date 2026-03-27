import { v2 } from "@google-cloud/translate";

// Support - languages supported: https://docs.cloud.google.com/translate/docs/languages
// See sample :
//     - https://github.com/googleapis/google-cloud-node/blob/main/packages/google-cloud-translate/samples/generated/v3beta1/translation_service.translate_text.js (read comments on model chosen)
//     - https://docs.cloud.google.com/translate/docs/samples/translate-text-with-model?hl=en

export async function GoogleCloud(locale: string, strings: string[], _attempt: number = 1): Promise<string[]> {

	if (!process.env.GOOGLE_CLOUD_API_KEY)
		throw new Error("Unable to find Google Cloud API Key, make sure you've set up GOOGLE_CLOUD_API_KEY in the environment file.");

	const { Translate } = v2;
	const translate = new Translate({ key: process.env.GOOGLE_CLOUD_API_KEY });
	const model = "nmt";

	const options = {
		// The target language
		to: locale,
		// Make sure your project is on the allow list.
		// Possible values are "base" and "nmt"
		model: model,
	};

	// Translates the text into the target language. "text" can be a string for
	// translating a single piece of text, or an array of strings for translating
	// multiple texts.
	let [translations] = await translate.translate(strings, options);

	translations = Array.isArray(translations) ? translations : [translations];
	console.log('Google Cloud Translations:');
	translations.forEach((translation, i) => {
		console.log(`${strings[i]} => (${locale}) ${translation}`);
	});

	return translations;
}


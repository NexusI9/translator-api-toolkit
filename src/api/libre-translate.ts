import { LOCALES } from "src/constants";
import { spawn } from "child_process";

const LIBRE_TRANSLATE_LOADED_LOCALES = ["en", "fr", "zt"] as const;

// Map standard locales to LibreTranslate format (the tricky one it zh-TW which doesn't simply become zh but zt)
// See: https://docs.libretranslate.com/guides/supported_languages/
const LIBRE_TRANSLATE_LOCALES_MAP: Partial<Record<keyof typeof LOCALES, typeof LIBRE_TRANSLATE_LOADED_LOCALES[number]>> = {
	"en-US": "en",
	"en-GB": "en",
	"en-CA": "en",
	"en-AU": "en",
	"fr-FR": "fr",
	"fr-CA": "fr",
	"zh-TW": "zt",
};

/**
		Currently unsuned, have conflict with pipenv starting from within NodeJS shell environment
 */
async function startLibre(host: string, port: string, locales: readonly string[]) {
	const args = [
		"run",
		"libretranslate",
		"--load-only",
		locales.join(","),
		"--host",
		host,
		"--port",
		port,
	];

	const proc = spawn("pipenv", args, {
		stdio: "inherit",
		shell: false,
	});

	proc.on("error", (_) => {
		throw new Error("Failed to start LibreTranslate");
	});

	// Wait until the server responds
	const url = `http://${host}:${port}/languages`;
	await waitForLibre(url);

	return proc; // optionally return the process if you want to kill it later
}

async function waitForLibre(url: string, timeoutMs = 5000) {
	const start = Date.now();

	while (true) {
		try {
			const res = await fetch(url);
			if (res.ok) return;
		} catch {}

		if (Date.now() - start > timeoutMs) {
			throw new Error("LibreTranslate did not start in time");
		}

		// wait 200ms before retry
		await new Promise((r) => setTimeout(r, 200));
	}
}


/**
	 Ensure the Libre Translate program is running by checking its running server URL
 */
async function isLibreRunning(serverURL: string) {
	try {
		const res = await fetch(`${serverURL}/languages`, {
			signal: AbortSignal.timeout(1000)
		});

		if (res.ok) {
			console.log("(LibreTranslate already running)");
			return true;
		}

		return false;
	} catch {
		console.log("LibreTranslate not running");
		return false;
	}

}


export async function LibreTranslate(locale: string, strings: string[], attempt: number = 1) {

	// Libre Translate Config
	const localServerHost = process.env.LIBRE_TRANSLATE_SERVER_HOST;
	const localServerPort = process.env.LIBRE_TRANSLATE_SERVER_PORT;


	if (!localServerHost)
		throw new Error("No Server Host were found for Libre Translate, make sure the variable LIBRE_TRANSLATE_SERVER_HOST is set in .env");

	if (!localServerPort)
		throw new Error("No Server Host were found for Libre Translate, make sure the variable LIBRE_TRANSLATE_SERVER_PORT is set in .env");

	// Request server
	const localServerURL = `http://${localServerHost}:${localServerPort}`;


	// Start local server if not already launched
	if (!(await isLibreRunning(localServerURL)))
		//TODO: start libre translate directly from here
		throw new Error("Libre Translate server is not running, make sure to start it by running the comment 'npm run libre'.");


	const targetLocale = LIBRE_TRANSLATE_LOCALES_MAP[locale as keyof typeof LOCALES];

	if (!targetLocale)
		throw new Error("Target language not supported by Libre Translate API.");

	const res = await fetch(`${localServerURL}/translate`, {
		method: "POST",
		body: JSON.stringify({
			q: strings.join("\n"),
			source: "en",
			target: targetLocale,
		}),
		headers: {
			"Content-Type": "application/json"
		}
	});



	/*
	Typically return:
			 {
		            translatedText: '內容\n' +
			          '瀏覽最新 Web 設計工具\n' +
			          '使用繁多的設計工具改善和放宽工作流程\n' +
			          '模板\n' 
			 }
	 */

	const { translatedText } = await res.json();

	if (!translatedText)
		throw new Error("Unable to retrieve translatedText key from the returned json");

	return translatedText.split('\n');

}

import { LOCALES } from "./constants";
import { Method } from "./types";
import fs from "fs/promises";

export class ArgsManager {

	// define locale to translate to (en-US, fr-FR, zh-TW)
	locale: keyof typeof LOCALES;
	// The path to the file or directory to translate (only JSON)
	input: string;
	// The output directory (creates a new one if doesn't exists)
	output: string;
	// Characters limit, stop the program if the translated character counts overlap the limit
	// Set to 0 for no limits
	maxChar: number;
	/// API method to use to translate (Gemini, Google Translate)
	api: Method;
	// Enable logs
	l: Boolean;
	// Enable verbose
	v: Boolean;
	// Enable DryRun (do not do any API calls)
	d: Boolean;
	// Override and retranslate already translated keys in the target file 
	o: Boolean;

	constructor() {
		this.locale = Object.keys(LOCALES)[0] as keyof typeof LOCALES;
		this.input = "";
		this.output = "";
		this.api = "UNDEFINED";
		this.l = false;
		this.v = false;
		this.d = false;
		this.o = false;
		this.maxChar = 0;
	}

	isObjectKey(key: string) {
		return key in this;
	}

	decode() {
		const processedArgs = process.argv.reduce((args: any, arg) => {

			// long arg
			if (arg.startsWith("--")) {
				const [flag, value] = arg.slice(2).split("=");
				args[flag] = value ?? true;
			}

			// flags
			else if (arg.startsWith("-")) {
				arg.slice(1).split("").forEach(flag => {
					args[flag] = true;
				});
			}

			return args;

		}, {});

		// Assign the decoded args to the object attributes
		Object.entries(processedArgs).forEach(([key, value]) => {
			if (this.isObjectKey(key))
				this[key as keyof typeof this] = value as any;
		});
	}

	#validateLocale(locale: string | null): keyof typeof LOCALES {

		if (!locale)
			throw new Error("No locale was provided, make sure to provide a locale using the --locale=... argument");


		const locales = Object.keys(LOCALES);
		const input = locale.trim().toLowerCase();

		// 1. Exact locale match (case-insensitive)
		const exact = locales.find(l => l.toLowerCase() === input);
		if (exact)
			return exact as keyof typeof LOCALES;


		// 2. Short language match (e.g. "en" -> "en-US")
		const short = locales.find(l => l.toLowerCase().startsWith(input + "-"));
		if (short)
			return short as keyof typeof LOCALES;



		throw new Error(
			"The provided locale does not match any supported locale. Make sure to use a valid BCP 47 / IETF locale format."
		);

	};


	async validate() {

		this.locale = this.#validateLocale(this.locale) as keyof typeof LOCALES;

		if (!this.input || !this.input.length)
			throw new Error("No folder or file where input, make sure to use the argument --input=FILE_PATH|DIR_PATH.");;


		if (!this.output || !this.output.length)
			throw new Error("No folder or file where set as output, make sure to use the argument --output=DIR_PATH.");

		const inputType = await this.getInputType();
		if (inputType === "INVALID")
			throw new Error(`The provided input "${this.input}" is neither a file nor a directory.`);
	}

	async getInputType(): Promise<"FILE" | "DIR" | "INVALID"> {
		const stat = await fs.stat(this.input);
		if (stat.isFile())
			return "FILE";
		else if (stat.isDirectory())
			return "DIR"


		return "INVALID";
	}

	print() {

		console.table({
			["Locale"]: this.locale,
			["Input"]: this.input,
			["Output"]: this.output,
			["Characters Limit"]: this.maxChar,
			["Logs"]: this.l,
			["Verbose"]: this.v,
			["Dry Run"]: this.d,
			["Override"]: this.o,
		});

	}


	get log() {
		return this.l;
	}

	get verbose() {
		return this.v;
	}

	get dryRun() {
		return this.d
	}

	get override() {
		return this.o;
	}


}

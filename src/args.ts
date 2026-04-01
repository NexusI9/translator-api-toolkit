import { LOCALES } from "./constants";
import { Method } from "./types";
import fs from "fs/promises";

/**
|--------------------------------------------------
| ArgsManager
|
| Read and convert command line argument into a
| valid configuration for the translation process.
|
|--------------------------------------------------
 */
export class ArgsManager {

	// define original file locale (en-US, fr-FR, zh-TW)
	sourceLocale: keyof typeof LOCALES;
	// define locale to translate to (en-US, fr-FR, zh-TW)
	targetLocale: keyof typeof LOCALES;
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
	log: Boolean;
	// Enable verbose
	verbose: Boolean;
	// Enable DryRun (do not do any API calls)
	dryRun: Boolean;
	// Override and retranslate already translated keys in the target file 
	override: Boolean;
	// Skip cache checking
	skipCache: Boolean;
	// Entierly skip split string from punctuation
	splitStringStrong: Boolean;
	// Skip split string for weak punctuation (only split with strong punctuation)
	splitStringWeak: Boolean;

	constructor() {
		this.sourceLocale = Object.keys(LOCALES)[0] as keyof typeof LOCALES;
		this.targetLocale = this.sourceLocale;
		this.input = "";
		this.output = "";
		this.api = "UNDEFINED";
		this.log = false;
		this.verbose = false;
		this.dryRun = false;
		this.override = false;
		this.skipCache = false;
		this.maxChar = 0;
		this.splitStringStrong = false;
		this.splitStringWeak = false;
	}

	/**
	 * If the given key belongs to the ArgsManager Object.
	 * This is helpful to automatically map the input arguments to
	 * the object internal attributes
	 *
	 * @param key - The attribute we wish to check
	 * @return True if key is in object, false if not
	 *
	 */
	isObjectKey(key: string) {
		return key in this;
	}


	/**
	 * Convert the given string to camel case.
	 * Primarily used to automatically convert and map args-name to argsName
	 * so it suits object attributes.
	 *
	 * @param str - The Value to convert
	 * @returns The Value converted to camelCase
	 *
	 */
	private toCamelCase(str: string): string {
		return str.replace(/-([a-z])/g, (_, char) => char.toUpperCase());
	}

	/**
	 * Convert passed commend line arguments and map their value to
	 * object instance internal attributes.
	 */
	decode() {
		const processedArgs = process.argv.reduce((args: any, arg) => {

			// long arg
			if (arg.startsWith("--")) {
				const [flag, value] = arg.slice(2).split("=");
				args[flag] = value ?? true;
			}

			// flags
			else if (arg.startsWith("-")) {
				const flag = arg.slice(1);
				args[flag] = true;
			}

			return args;

		}, {});

		// Assign the decoded args to the object attributes
		Object.entries(processedArgs).forEach(([key, value]) => {
			const camelCase = this.toCamelCase(key);

			console.log(key, camelCase);
			if (this.isObjectKey(camelCase))
				this[camelCase as keyof typeof this] = value as any;
		});
	}

	/**
	 * Analyse and validate target and source locale command arguments.
	 *
	 * @param locale - The locale to validate
	 * @returns The locale if found in the valid locale list.
	 * @exception Throws error if no valid locale were found.
	 *
	 */
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

	/**
	 * Ensure essential arguments are defined.
	 *
	 * @exception Throws error if necessary arguments are not defined.
	 */
	async validate() {

		this.targetLocale = this.#validateLocale(this.targetLocale) as keyof typeof LOCALES;
		this.sourceLocale = this.#validateLocale(this.sourceLocale) as keyof typeof LOCALES;

		if (this.targetLocale === this.sourceLocale)
			throw new Error("Your source locale matches your target locale. Make sure to set a target language different from your source language using the argument --targetLocale");

		if (!this.input || !this.input.length)
			throw new Error("No folder or file where input, make sure to use the argument --input=FILE_PATH|DIR_PATH.");;


		if (!this.output || !this.output.length)
			throw new Error("No folder or file where set as output, make sure to use the argument --output=DIR_PATH.");

		const inputType = await this.getInputType();
		if (inputType === "INVALID")
			throw new Error(`The provided input "${this.input}" is neither a file nor a directory.`);

	}

	/**
	 * Provide the type of argument input path.
	 * Used during validation to make sure the directory or file exists
	 * as well as prior translating to define if we shall read and translate
	 * only one file or a whole directory.
	 *
	 * @returns FILE or DIR according to the path type or INVALID if the path doesn't exists
	 *
	 */
	async getInputType(): Promise<"FILE" | "DIR" | "INVALID"> {
		const stat = await fs.stat(this.input);
		if (stat.isFile())
			return "FILE";
		else if (stat.isDirectory())
			return "DIR"


		return "INVALID";
	}

	/**
	 * Prints out the given arguments.
	 * Used before running the translation to make
	 * sure the configuration is correct and prevent
	 * unwanted settings (dry run, wrong API etc...)
	 */
	print() {

		console.table({
			["Source Locale"]: this.sourceLocale,
			["Target Locale"]: this.targetLocale,
			["Input"]: this.input,
			["Output"]: this.output,
			["API"]: this.api,
			["Characters Limit"]: this.maxChar,
			["Logs"]: this.log,
			["Verbose"]: this.verbose,
			["Dry Run"]: this.dryRun,
			["Override"]: this.override,
			["Skip Cache"]: this.skipCache,
			["Split String (Strong)"]: this.splitStringStrong,
			["Split String (Weak)"]: this.splitStringWeak,
		});

	}


}

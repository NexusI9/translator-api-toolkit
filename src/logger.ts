import path from "path";
import fs from "fs/promises";
import { LOG_FOLDER } from "./constants";
import { Method } from "./types";

/**
|--------------------------------------------------
| Logger
|
| Responsible for storing translation results and
| relative metadata such as character count, 
| or process duration.
| Output data in the log folder under log or/and
| csv files.
|
|--------------------------------------------------
 */
export class Logger {

	// Record of translated strings
	list: {
		locale: string;
		source: string;
		result: string;
	}[] = [];
	// The sum of translated characters
	charactersCount: number = 0;
	// The elapsed time for the whole translation session
	elapsedTime: number = 0;
	// The api method used for the session
	apiMethod: string | undefined;

	/**
	 * Push the source text and its translated result in the active log list
	 * and increase the character count according to the source text length
	 *
	 * @param locale - The target locale the string was translated to
	 * @param source - The original string
	 * @param result - The translated string
	 * 
	 */
	push(locale: string, source: string, result: string) {
		this.charactersCount += source.length;
		this.list.push({ locale, source, result });
	}

	/**
	 * Create a log file under the log dir and convert the list into a string. 
	 */
	async write() {

		await fs.mkdir(LOG_FOLDER, { recursive: true });
		const logFile = path.join(
			LOG_FOLDER,
			`translate-${Date.now()}.log`
		);

		let summary = `\nTotal characters translated: ${this.charactersCount}`;

		if (this.elapsedTime)
			summary += ` (${this.elapsedTime}ms)`;

		if (this.apiMethod)
			summary += ` using '${this.apiMethod}' api.\n`;

		const logList = this.list.map(({ locale, source, result }) => `[${locale}] ${source} -> ${result} (${source.length} chars)`);
		await fs.writeFile(logFile, logList.join("\n") + summary, "utf8");

	}

	/**
	 * Create a CSV file under the log dir and convert the log data into a table
	 * @description Co-jointly used with the write method after the translation is done
	 * 
	 */
	async writeCSV() {
		await fs.mkdir(LOG_FOLDER, { recursive: true });
		const csvFile = path.join(
			LOG_FOLDER,
			`translate-${Date.now()}.csv`
		);

		const csvEscape = (v: string) => `"${v.replace(/"/g, '""')}"`;

		const header = ["Locale", "Source", "Result", "Character count"].join(",");

		const logList = this.list.map(({ locale, source, result }) =>
			[
				locale,
				csvEscape(source),
				csvEscape(result),
				source.length
			].join(",")
		);

		const summary = ["", "", "TOTAL", this.charactersCount].join(",");

		const content = [
			header,
			...logList,
			summary
		].join("\n");

		await fs.writeFile(csvFile, content, "utf8");

	}

	/**
	 * Update the elapsed time
	 * @description Usually computed with the Time class
	 *
	 * @param number - The duration of translation process in ms
	 * 
	 */
	setElapsedTime(number: number) {
		this.elapsedTime = number;
	}

	/**
	 * Update the API Method.  
	 * @description Shall be defined from the command line argument.
	 *
	 * @param method - The API used for the translation session
	 * 
	 */
	setApiMethod(method: Method) {
		this.apiMethod = method;
	}


}

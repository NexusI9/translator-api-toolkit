import path from "path";
import fs from "fs/promises";
import { LOG_FOLDER } from "./constants";
import { Method } from "./types";

export class Logger {

	list: {
		locale: string;
		source: string;
		result: string;
	}[] = [];
	charactersCount: number = 0;
	elapsedTime: number = 0;
	apiMethod: string | undefined;

	/**
	Push the source text and its translated result in the active log list and increase the character count according to the source text length.
	*/
	push(locale: string, source: string, result: string) {
		this.charactersCount += source.length;
		this.list.push({ locale, source, result });
	}

	/**
	Create a log file under the log dir and convert the list into a string.
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

	setElapsedTime(number: number) {
		this.elapsedTime = number;
	}

	setApiMethod(method: Method) {
		this.apiMethod = method;
	}


}

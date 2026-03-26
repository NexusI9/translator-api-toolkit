
export type Method = "UNDEFINED" | "GEMINI" | "GOOGLE_CLOUD" | "LIBRE_TRANSLATE" | "DEEPL";

export type StringDico = Record<string, string>;
export type Dico = Record<string, string | number>;

export type TBatchArray = string[];

interface RecordFilterCustomRules {
	target: "KEY" | "VALUE";
	type: "REGEXP";
	rule: RegExp;
};

interface RecordFilterPresetRules {
	target: "KEY" | "VALUE";
	type: "PRESET";
	rule: "FILTER_EMPTY_STRING" | "FILTER_NUMBER";
};

interface RecordFilterListRules {
	target: "KEY" | "VALUE";
	type: "LIST";
	rule: string[];
};

export type RecordFilter = RecordFilterPresetRules | RecordFilterCustomRules | RecordFilterListRules;

export type APIMethodFn = (locale: string, strings: string[], attempt: number) => Promise<string[]>;

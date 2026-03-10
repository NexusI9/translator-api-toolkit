import { RecordFilter } from "./types";

export const SOURCE_LANG = "en-US";
export const CACHE_FOLDER = "cache";
export const LOG_FOLDER = "logs";

export const BATCH_SIZE = 25;

export const JSON_KEY_BLACKLIST = ["href", "picture", "value", "path", "icon", "filter", "resource_id", "type", "tag_id"];
export const REGEXP_URL = /^https?:\/\//i; // http://...
export const REGEXP_PATH = /^\/[^\s]+\.[a-z0-9]+$/i; // /my/path/to/file.docx
export const REGEXP_HTML_DATA = /^data-[a-z0-9_-]+$/i; // data-something
export const REGEXP_CONSTANT = /^[A-Z0-9_\s-]+$/; // CONSTANTS
export const REGEXP_PROTECTED_ONLY = /^\[\[.*\]\]$/; // [[value]]
export const REGEXP_PROTECTED = /\[\[(.*?)\]\]/g; // ... [[value]] ...
export const REGEXP_VARIABLE = /\{.*?\}/g; // ... {variable} ... 


export const TRANSLATION_FILTERS: RecordFilter[] = [
	{ type: "PRESET", rule: "FILTER_EMPTY_STRING", target: "VALUE" },
	{ type: "PRESET", rule: "FILTER_NUMBER", target: "VALUE" },
	{ type: "REGEXP", rule: REGEXP_URL, target: "VALUE" },
	{ type: "REGEXP", rule: REGEXP_PATH, target: "VALUE" },
	{ type: "REGEXP", rule: REGEXP_HTML_DATA, target: "VALUE" },
	{ type: "REGEXP", rule: REGEXP_CONSTANT, target: "VALUE" },
	{ type: "REGEXP", rule: REGEXP_PROTECTED_ONLY, target: "VALUE" },
	{ type: "LIST", rule: JSON_KEY_BLACKLIST, target: "KEY" }
];

export const KEY_SPLIT_CHAR = "/";


export const LOCALES = {
	"en-US": { language: "English", region: "United States" },
	"en-GB": { language: "English", region: "United Kingdom" },
	"en-CA": { language: "English", region: "Canada" },
	"en-AU": { language: "English", region: "Australia" },

	"fr-FR": { language: "French", region: "France" },
	"fr-CA": { language: "French", region: "Canada" },
	"fr-BE": { language: "French", region: "Belgium" },
	"fr-CH": { language: "French", region: "Switzerland" },

	"es-ES": { language: "Spanish", region: "Spain" },
	"es-MX": { language: "Spanish", region: "Mexico" },
	"es-AR": { language: "Spanish", region: "Argentina" },

	"de-DE": { language: "German", region: "Germany" },
	"de-AT": { language: "German", region: "Austria" },
	"de-CH": { language: "German", region: "Switzerland" },

	"it-IT": { language: "Italian", region: "Italy" },
	"it-CH": { language: "Italian", region: "Switzerland" },

	"pt-PT": { language: "Portuguese", region: "Portugal" },
	"pt-BR": { language: "Portuguese", region: "Brazil" },

	"nl-NL": { language: "Dutch", region: "Netherlands" },
	"nl-BE": { language: "Dutch", region: "Belgium" },

	"sv-SE": { language: "Swedish", region: "Sweden" },
	"da-DK": { language: "Danish", region: "Denmark" },
	"no-NO": { language: "Norwegian", region: "Norway" },
	"fi-FI": { language: "Finnish", region: "Finland" },

	"pl-PL": { language: "Polish", region: "Poland" },
	"cs-CZ": { language: "Czech", region: "Czech Republic" },

	"ru-RU": { language: "Russian", region: "Russia" },
	"uk-UA": { language: "Ukrainian", region: "Ukraine" },

	"tr-TR": { language: "Turkish", region: "Turkey" },

	"ar-SA": { language: "Arabic", region: "Saudi Arabia" },
	"he-IL": { language: "Hebrew", region: "Israel" },

	"hi-IN": { language: "Hindi", region: "India" },

	"th-TH": { language: "Thai", region: "Thailand" },
	"vi-VN": { language: "Vietnamese", region: "Vietnam" },
	"id-ID": { language: "Indonesian", region: "Indonesia" },

	"zh-CN": { language: "Chinese", region: "China (Simplified)" },
	"zh-TW": { language: "Chinese", region: "Taiwan (Traditional)" },
	"zh-HK": { language: "Chinese", region: "Hong Kong (Traditional)" },

	"ja-JP": { language: "Japanese", region: "Japan" },
	"ko-KR": { language: "Korean", region: "South Korea" }
};

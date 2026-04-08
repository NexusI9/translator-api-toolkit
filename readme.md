# Translator API CLI

A **Node.js / TypeScript CLI tool** to batch translate **JSON files or directories** using predefined translation APIs.

Supported providers:

- Gemini
- Google Cloud Translate
- DeepL
- LibreTranslate

The toolkit analyzes files beforehand and uses a **cache system** to avoid translating identical values multiple times.

Languages must follow the **BCP 47 / IETF locale format** (for example `en-US`, `fr-FR`, `zh-TW`).

---

## Features

- Translate **single JSON files** or **entire directories**
- Preserve **folder and JSON structure**
- **Cache system** to avoid duplicate translations
- **Pre-analysis** to reduce API calls
- **Character limit protection**
- **Dry-run mode**
- **Session logging**
- Multiple translation providers

---

## Installation

```
npm install
```

Create a `.env` file in the project root:

GEMINI_API_KEY=your_key  
GOOGLE_API_KEY=your_key  
DEEPL_API_KEY=your_key

---

## Usage

npm run start -- [arguments]

Example:
```
npm run start -- \
--target-locale=zh-TW \
--input=./example/en-US \
--output=./example \
--api=gemini \
-log \
-verbose \
-skip-cache
```
---

## Arguments

| Argument | Description |
|--------|--------|
| --source-locale | Source locale (**BCP 47 format**, e.g. `en-US`, `fr-FR`, `zh-TW`) default is `en-US` |
| --target-locale | Target locale (**BCP 47 format**, e.g. `en-US`, `fr-FR`, `zh-TW`) default is `en-US` |
| --input | Path to JSON file or directory to translate |
| --output | Output directory (created if missing) |
| --max-char | Character translation limit (`0` = unlimited) |
| --api | Translation provider (`GEMINI`, `GOOGLE_CLOUD`, `DEEPL`, `LIBRE_TRANSLATE`) |
| -log | Enable logs |
| -verbose | Verbose output |
| -dry-run | Dry run (no API calls) |
| -override | Override already translated values |
| -skip-cache | Skip cache checking |
| -split-string-strong | Split strings into small chunk from strong punctuation |
| -split-string-weak |  Split strings into small chunk from weaker punctuation |

---

## Logging

Each translation session generates logs containing:

- processed files
- number of translated strings
- cached strings reused
- API provider used
- character count
- execution duration

Logs are written in two formats:

1. **Readable log file**
2. **CSV report**

Example structure:

logs/  
session-AAAAMMDDHHMMSS.log  
session-AAAAMMDDHHMMSS.csv

The CSV file can be used for:

- translation cost estimation
- translation analytics
- reporting

Example CSV:  
file,strings,translated,cached,characters,api  
example/en-US/input.json,120,36,84,2431,gemini

---

## Example

Input:
```
example/
└─ en-US/
└─ input.json
```
Command:
```
npm run start -- --locale=zh-TW --input=./example/en-US --output=./example --api=gemini
```
Output:
```
example/
├─ en-US/
└─ zh-TW/
└─ input.json
```
---

## License

ISC

---

## Author

Nassim El Khantour

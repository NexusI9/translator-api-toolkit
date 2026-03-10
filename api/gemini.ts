export async function Gemini(content: string) {


	const PROMPT = `${content}`;

	if (!process.env.GEMINI_API_KEY)
		throw new Error("Unable to find Gemini API Key");


	const response = await fetch(
		"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
		{
			method: "POST",
			headers: {
				"x-goog-api-key": process.env.GEMINI_API_KEY,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				contents: [
					{
						parts: [
							{
								text: PROMPT,
							},
						],
					},
				],
			}),
		}
	);

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(`HTTP ${response.status}: ${errorText} `);
	}

	const data = await response.json();
	console.log(JSON.stringify(data, null, 2));

	const text =
		data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join("") ?? "";
	console.log("\nGenerated text:\n", text);



}

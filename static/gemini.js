export async function generateContent(prompt) {
    // Simulated API call for generating a post
    console.log("Mocking gemini API call with prompt:", prompt);

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Determine tone based on prompt heuristics for the mock
    let tonePhrase = "🚀 Just wrapped up another productive week!";
    if (prompt.includes("Enthusiastic")) tonePhrase = "🔥 Absolutely CRUSHED it this week! So excited to share:";
    if (prompt.includes("Professional")) tonePhrase = "A reflective look back at this week's professional milestones:";

    return {
        candidates: [{
            content: {
                parts: [{
                    text: `${tonePhrase}\n\nI made some great progress on my goals and logged several key activities. The momentum is building!\n\nWhat did you accomplish this week?\n\n---\nSuggested Hashtags: #buildinpublic, #careerdevelopment, #learning, #growth`
                }]
            }
        }]
    };
}

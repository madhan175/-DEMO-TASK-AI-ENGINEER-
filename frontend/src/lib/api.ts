const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

if (!API_BASE_URL) {
    console.warn("NEXT_PUBLIC_API_BASE_URL is not defined. API calls will likely fail.");
}

export async function generateApp(prompt: string, model: string = "gemini") {
    if (!API_BASE_URL) throw new Error("API Base URL not configured");

    const response = await fetch(`${API_BASE_URL}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, model }),
    });
    if (!response.ok) throw new Error(`Generation failed: ${response.statusText}`);
    return response.json();
}

export async function getPipelineStatus(projectId: string) {
    if (!API_BASE_URL) throw new Error("API Base URL not configured");
    const response = await fetch(`${API_BASE_URL}/status/${projectId}`);
    if (!response.ok) return null;
    return response.json();
}

export async function getProject(projectId: string) {
    if (!API_BASE_URL) throw new Error("API Base URL not configured");
    const response = await fetch(`${API_BASE_URL}/project/${projectId}`);
    if (!response.ok) return null;
    return response.json();
}

export async function getAnalytics() {
    if (!API_BASE_URL) throw new Error("API Base URL not configured");
    const response = await fetch(`${API_BASE_URL}/analytics`);
    if (!response.ok) return { total_generations: 0, success_rate: 0, avg_runtime: 0 };
    return response.json();
}

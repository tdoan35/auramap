import { API_BASE_URL } from "@/utils/constants";

export async function healthCheck(): Promise<{ status: string }> {
  const res = await fetch(`${API_BASE_URL}/health`);
  return res.json();
}

export async function askQuestion(
  tourId: string,
  question: string,
  context: any
): Promise<{ answer: string; audio_url: string }> {
  const res = await fetch(`${API_BASE_URL}/tour/${tourId}/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, context }),
  });
  return res.json();
}

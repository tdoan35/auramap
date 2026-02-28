import requests
from backend.config import FASTINO_API_KEY, FASTINO_MODEL_ID, FASTINO_API_URL


def invoke_claude(
    prompt: str,
    system_prompt: str = "",
    max_tokens: int = 2048,
) -> str:
    """Call Fastino (Llama 3.3 70B) and return the text response.

    Keeps the same interface as the old Bedrock client so all callers
    (generate_outline, generate_segment, city_agent) work unchanged.
    """
    messages = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    messages.append({"role": "user", "content": prompt})

    response = requests.post(
        FASTINO_API_URL,
        headers={
            "Content-Type": "application/json",
            "X-API-Key": FASTINO_API_KEY,
        },
        json={
            "model_id": FASTINO_MODEL_ID,
            "task": "generate",
            "messages": messages,
            "max_tokens": max_tokens,
        },
        timeout=60,
    )
    response.raise_for_status()

    data = response.json()

    if "completion" in data:
        return data["completion"]
    else:
        raise ValueError(f"Unexpected Fastino response format: {list(data.keys())}")

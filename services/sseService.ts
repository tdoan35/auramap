import { TourGenerateRequest, SSEStatusEvent, SSESegmentEvent, SSECompleteEvent, SSEReasoningEvent } from "@/types";
import { API_BASE_URL } from "@/utils/constants";

interface SSECallbacks {
  onStatus: (data: SSEStatusEvent) => void;
  onSegment: (data: SSESegmentEvent) => void;
  onComplete: (data: SSECompleteEvent) => void;
  onReasoning?: (data: SSEReasoningEvent) => void;
  onError: (error: string) => void;
}

/**
 * Connect to the tour generation SSE stream via POST request.
 * React Native doesn't support native EventSource, so we use fetch + manual line parsing.
 * Returns a close function to abort the connection.
 */
export function connectToTourStream(
  request: TourGenerateRequest,
  callbacks: SSECallbacks
): { close: () => void } {
  const controller = new AbortController();

  (async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/tour/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
        body: JSON.stringify(request),
        signal: controller.signal,
      });

      if (!response.ok) {
        callbacks.onError(`HTTP ${response.status}: ${response.statusText}`);
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        callbacks.onError("No response body reader available");
        return;
      }

      const decoder = new TextDecoder();
      let buffer = "";
      let currentEvent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process complete lines
        const lines = buffer.split("\n");
        buffer = lines.pop() || ""; // Keep incomplete last line in buffer

        for (const line of lines) {
          const trimmed = line.trim();

          if (trimmed.startsWith("event:")) {
            currentEvent = trimmed.slice(6).trim();
          } else if (trimmed.startsWith("data:")) {
            const dataStr = trimmed.slice(5).trim();
            try {
              const data = JSON.parse(dataStr);
              switch (currentEvent) {
                case "status":
                  callbacks.onStatus(data);
                  break;
                case "segment":
                  callbacks.onSegment(data);
                  break;
                case "complete":
                  callbacks.onComplete(data);
                  break;
                case "reasoning":
                  callbacks.onReasoning?.(data);
                  break;
              }
            } catch (e) {
              // Skip non-JSON data lines
            }
            currentEvent = "";
          }
        }
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        callbacks.onError(err.message || "SSE connection failed");
      }
    }
  })();

  return {
    close: () => controller.abort(),
  };
}

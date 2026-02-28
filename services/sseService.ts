import { TourGenerateRequest, SSEStatusEvent, SSESegmentEvent, SSECompleteEvent, SSEReasoningEvent, SSEOutlineEvent } from "@/types";
import { API_BASE_URL } from "@/utils/constants";

interface SSECallbacks {
  onStatus: (data: SSEStatusEvent) => void;
  onOutline?: (data: SSEOutlineEvent) => void;
  onSegment: (data: SSESegmentEvent) => void;
  onComplete: (data: SSECompleteEvent) => void;
  onReasoning?: (data: SSEReasoningEvent) => void;
  onError: (error: string) => void;
}

/**
 * Connect to the tour generation SSE stream via POST request.
 * Uses XMLHttpRequest for reliable streaming in React Native (fetch doesn't support ReadableStream).
 * Returns a close function to abort the connection.
 */
export function connectToTourStream(
  request: TourGenerateRequest,
  callbacks: SSECallbacks
): { close: () => void } {
  const xhr = new XMLHttpRequest();
  let lastIndex = 0;
  let currentEvent = "";

  xhr.open("POST", `${API_BASE_URL}/tour/generate`);
  xhr.setRequestHeader("Content-Type", "application/json");
  xhr.setRequestHeader("Accept", "text/event-stream");
  xhr.setRequestHeader("Bypass-Tunnel-Reminder", "true");

  xhr.onprogress = () => {
    const newData = xhr.responseText.substring(lastIndex);
    lastIndex = xhr.responseText.length;

    const lines = newData.split("\n");
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
            case "outline":
              callbacks.onOutline?.(data);
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
  };

  xhr.onerror = () => {
    callbacks.onError("SSE connection failed");
  };

  xhr.ontimeout = () => {
    callbacks.onError("SSE connection timed out");
  };

  xhr.onreadystatechange = () => {
    if (xhr.readyState === XMLHttpRequest.DONE) {
      if (xhr.status !== 200 && xhr.status !== 0) {
        callbacks.onError(`HTTP ${xhr.status}: ${xhr.statusText}`);
      }
    }
  };

  xhr.send(JSON.stringify(request));

  return {
    close: () => xhr.abort(),
  };
}

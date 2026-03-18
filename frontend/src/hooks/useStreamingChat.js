import { useState, useCallback, useRef } from 'react';
import { API_BASE } from '../config';

export function useStreamingChat() {
  const [isStreaming, setIsStreaming] = useState(false);
  const abortControllerRef = useRef(null);

  const sendMessage = useCallback(async (message, conversationId, onChunk, onDone, onError) => {
    setIsStreaming(true);
    abortControllerRef.current = new AbortController();

    try {
      const token = localStorage.getItem('token');
      // Use /chat directly (non-streaming) - more reliable
      const response = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ message, conversation_id: conversationId }),
        signal: abortControllerRef.current.signal
      });

      // Always use non-streaming fallback first (more reliable)
      const useStreaming = response.ok && response.headers.get('content-type')?.includes('text/event-stream');

      if (!useStreaming) {
        // Non-streaming: use /chat endpoint
        let chatResponse = response;
        if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) {
          chatResponse = await fetch(`${API_BASE}/chat`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ message, conversation_id: conversationId })
          });
        }
        const data = await chatResponse.json();
        const text = data.response || data.message || data.text || JSON.stringify(data);
        onChunk(text);
        onDone(data);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const parsed = JSON.parse(line.slice(6));
              if (parsed.text) onChunk(parsed.text);
              if (parsed.done) onDone(parsed);
            } catch (e) {
              // Skip malformed JSON
            }
          }
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        onError(err);
      }
    } finally {
      setIsStreaming(false);
    }
  }, []);

  const stopStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  return { sendMessage, stopStreaming, isStreaming };
}

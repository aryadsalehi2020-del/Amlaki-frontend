import { API_BASE } from '../config';

// Consume the /analyze/stream SSE endpoint.
//
// EventSource doesn't allow custom headers (no Authorization), so we use fetch
// with a manual ReadableStream reader and parse the SSE wire format ourselves.
//
// Calls onPhase(eventName, data) for each phase event:
//   - "marktdaten":   { marktdaten, no_go_check, warnsignale, kennzahlen, kaufnebenkosten }
//   - "berechnungen": { cashflow_analyse, investment_metriken, tilgungsplan, ... ~18 keys }
//   - "ki_bewertung": { gesamtscore, kriterien, stärken, schwächen, zusammenfassung, empfehlung, fairer_preis, potenzial_szenarien, verwendungszweck }
//   - "extras":       { verhandlungsmail, besichtigungs_roadmap, besichtigt }
//   - "complete":     { analysis_id, is_premium }
//
// Throws on "error" events with { status, detail } and on network failures.
export async function streamAnalyze(requestBody, token, onPhase, signal) {
  const response = await fetch(`${API_BASE}/analyze/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(requestBody),
    signal,
  });

  if (!response.ok) {
    let detail = `HTTP ${response.status}`;
    try {
      const body = await response.json();
      detail = body.detail || detail;
    } catch {
      // not json, ignore
    }
    const err = new Error(detail);
    err.status = response.status;
    throw err;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // SSE events are delimited by a blank line ("\n\n"). Split on that and
    // keep the last (possibly incomplete) chunk in the buffer.
    const events = buffer.split('\n\n');
    buffer = events.pop() || '';

    for (const raw of events) {
      if (!raw.trim()) continue;

      let eventName = 'message';
      let dataLines = [];
      for (const line of raw.split('\n')) {
        if (line.startsWith('event:')) eventName = line.slice(6).trim();
        else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim());
      }

      if (dataLines.length === 0) continue;

      let payload;
      try {
        payload = JSON.parse(dataLines.join('\n'));
      } catch (e) {
        console.warn('[streamAnalyze] Failed to parse SSE payload', e, dataLines);
        continue;
      }

      if (eventName === 'error') {
        const err = new Error(payload.detail || 'Streaming-Fehler');
        err.status = payload.status || 500;
        throw err;
      }

      onPhase(eventName, payload);
    }
  }
}

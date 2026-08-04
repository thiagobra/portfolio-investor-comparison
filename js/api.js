/**
 * @module   api
 * @purpose  Client for the LM Studio chat proxy: streams a reply token-by-
 *           token, plus a plain reachability check.
 * @exports  streamChat(messages, onToken) · checkHealth()
 * @usedby   @js/views/advisor.js @js/views/data/connection.js
 */

export async function checkHealth() {
  const res = await fetch('/api/health');
  return res.json();
}

/**
 * Streams a chat completion from /api/chat (SSE, OpenAI-compatible).
 * Calls onToken(deltaText) as chunks arrive; resolves to the full reply.
 */
export async function streamChat(messages, onToken) {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, stream: true }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `LM Studio request failed (${res.status})`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let full = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop();
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;
      const data = trimmed.slice(5).trim();
      if (data === '[DONE]' || data === '') continue;
      try {
        const delta = JSON.parse(data).choices?.[0]?.delta?.content;
        if (delta) {
          full += delta;
          onToken(delta);
        }
      } catch {
        // partial/invalid chunk straddling a read boundary — skip it
      }
    }
  }
  return full;
}

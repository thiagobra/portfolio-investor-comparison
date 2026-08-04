/**
 * @module   views/advisor
 * @purpose  Ask the Advisor: a chat screen against the local LM Studio model,
 *           with a note-taking loop that appends short factual statements
 *           about the user to private/profile.md after each answer.
 * @exports  mount(root)
 * @reads    @js/store.js @js/lib/classification.js @js/lib/risk-reference.js
 *           @js/analytics/summary.js @js/api.js
 * @usedby   @js/router.js
 */

import { getPortfolio } from '../store.js';
import { loadFxRates } from '../lib/fx.js';
import { loadClassification } from '../lib/classification.js';
import { loadSectorCorrelations, loadSectorVolatility } from '../lib/risk-reference.js';
import { buildPortfolioSummary } from '../analytics/summary.js';
import { streamChat, checkHealth } from '../api.js';
import { showToast } from '../toast.js';
import { emptyStateHTML } from './shared/empty-state.js';
import { escapeHtml } from '../lib/escape.js';

const CATEGORY_HEADING = {
  FACTS: '## Facts',
  GOALS: '## Goals',
  CONSTRAINTS: '## Constraints',
  RISK: '## Risk appetite',
  QUESTIONS: '## Open questions',
};

const NOTE_PROMPT = `You are a financial adviser's assistant taking case notes on your client, based on the conversation so far. Write 0 to 3 short, factual, third-person statements about the client — no advice, no repeating generic info already obvious from the question. Each statement belongs to exactly one category: FACTS, GOALS, CONSTRAINTS, RISK, QUESTIONS (something still unresolved worth asking later). Output ONLY lines in this exact format, one per statement:
CATEGORY: statement text
If there is nothing new and specific to note, output exactly: NONE`;

function appendNote(content, category, statement, dateStr, question) {
  const heading = CATEGORY_HEADING[category];
  if (!heading) return content;
  const lines = content.split('\n');
  const headingIdx = lines.findIndex((l) => l.trim() === heading);
  if (headingIdx === -1) return content;

  let insertAt = lines.length;
  for (let i = headingIdx + 1; i < lines.length; i++) {
    if (lines[i].startsWith('## ')) { insertAt = i; break; }
  }
  while (insertAt > headingIdx + 1 && lines[insertAt - 1].trim() === '') insertAt--;

  const truncatedQuestion = question.length > 80 ? `${question.slice(0, 80)}…` : question;
  lines.splice(insertAt, 0, `- [${dateStr}] ${statement} (from: "${truncatedQuestion}")`);
  return lines.join('\n');
}

async function takeNotes(question, answer) {
  const noteMessages = [
    { role: 'system', content: NOTE_PROMPT },
    { role: 'user', content: `Client's question: ${question}\n\nYour answer: ${answer}` },
  ];
  const raw = await streamChat(noteMessages, () => {});
  const noteLines = raw.split('\n').map((l) => l.trim()).filter(Boolean);

  const notes = [];
  for (const line of noteLines) {
    const match = line.match(/^(FACTS|GOALS|CONSTRAINTS|RISK|QUESTIONS):\s*(.+)$/i);
    if (match) notes.push({ category: match[1].toUpperCase(), statement: match[2] });
  }
  if (notes.length === 0) return 0;

  const res = await fetch('/api/files?path=private/profile.md');
  const { content } = await res.json();
  const dateStr = new Date().toISOString().slice(0, 10);
  let updated = content;
  for (const note of notes) {
    updated = appendNote(updated, note.category, note.statement, dateStr, question);
  }
  await fetch('/api/files', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: 'private/profile.md', content: updated }),
  });
  return notes.length;
}

export async function mount(root) {
  const portfolio = getPortfolio();
  if (!portfolio || portfolio.openPositions.length === 0) {
    root.innerHTML = emptyStateHTML();
    return;
  }

  const health = await checkHealth();
  if (!health.reachable) {
    root.innerHTML = `
      <section class="section">
        <h2 class="section-title">Ask the Advisor</h2>
        <div class="warning-banner">⚠️ LM Studio isn't reachable at ${escapeHtml(health.host)}. Check <strong>Advisor → Connection</strong>.</div>
      </section>
    `;
    return;
  }

  const [, classification, correlationMatrix, volatilityBySector, profileRes] = await Promise.all([
    loadFxRates(), loadClassification(), loadSectorCorrelations(), loadSectorVolatility(),
    fetch('/api/files?path=private/profile.md').then((r) => r.json()),
  ]);

  const summary = buildPortfolioSummary(portfolio, classification, correlationMatrix, volatilityBySector);
  const systemPrompt = `You are a thoughtful financial advisor helping a client understand their own portfolio. Be concise and concrete. Never suggest specific trades to execute; discuss tradeoffs and let the client decide.\n\nWhat you know about the client so far:\n${profileRes.content}\n\n${summary}`;

  const history = [{ role: 'system', content: systemPrompt }];

  root.innerHTML = `
    <section class="section">
      <h2 class="section-title">Ask the Advisor</h2>
      <p class="section-hint">Running against <strong>${escapeHtml(health.model)}</strong> at ${escapeHtml(health.host)}. Nothing leaves your PC.</p>
      <div class="card">
        <div class="chat-log" id="chat-log"></div>
        <div class="chat-input-row">
          <textarea id="chat-input" placeholder="Ask about your portfolio… (Enter to send, Shift+Enter for a new line)"></textarea>
          <button class="btn btn-primary" id="chat-send">Send</button>
        </div>
      </div>
    </section>
  `;

  const log = root.querySelector('#chat-log');
  const input = root.querySelector('#chat-input');
  const sendBtn = root.querySelector('#chat-send');

  function addBubble(role, text) {
    const el = document.createElement('div');
    el.className = `chat-bubble chat-bubble-${role}`;
    el.textContent = text;
    log.appendChild(el);
    log.scrollTop = log.scrollHeight;
    return el;
  }

  async function send() {
    const question = input.value.trim();
    if (!question) return;
    input.value = '';
    sendBtn.disabled = true;

    addBubble('user', question);
    history.push({ role: 'user', content: question });

    const assistantEl = addBubble('assistant', '');
    assistantEl.classList.add('streaming');
    let answer = '';
    try {
      answer = await streamChat(history, (delta) => {
        answer += delta;
        assistantEl.textContent = answer;
        log.scrollTop = log.scrollHeight;
      });
    } catch (err) {
      assistantEl.textContent = `⚠️ ${err.message}`;
      assistantEl.classList.remove('streaming');
      sendBtn.disabled = false;
      return;
    }
    assistantEl.classList.remove('streaming');
    history.push({ role: 'assistant', content: answer });
    sendBtn.disabled = false;

    try {
      const noteCount = await takeNotes(question, answer);
      if (noteCount > 0) showToast(`📝 Noted ${noteCount} new thing(s) about you — see Advisor → My profile notes`);
    } catch {
      // Note-taking is best-effort; a failure here shouldn't disrupt the chat.
    }
  }

  sendBtn.addEventListener('click', send);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  });
}

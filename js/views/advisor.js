/**
 * @module   views/advisor
 * @purpose  Ask the Advisor: a chat screen against the local LM Studio model.
 *           System prompt = private/profile.md's standing instructions +
 *           the full advisor context (holdings, closed trades, metrics
 *           store). A staged pipeline indicator shows real progress and
 *           real token counts before the first reply; a collapsible panel
 *           shows exactly what was sent. Note-taking loop appends short
 *           factual statements about the user to private/profile.md.
 * @exports  mount(root)
 * @reads    @js/store.js @js/lib/classification.js @js/lib/metrics.js
 *           @js/analytics/advisor-context.js @js/api.js
 * @usedby   @js/router.js
 */

import { getPortfolio } from '../store.js';
import { loadFxRates, getFxAsOf } from '../lib/fx.js';
import { loadClassification } from '../lib/classification.js';
import { loadMetrics } from '../lib/metrics.js';
import { loadAllocation } from '../lib/allocation.js';
import { loadTransactions } from '../lib/transactions.js';
import { loadSectorCorrelations, loadSectorVolatility } from '../lib/risk-reference.js';
import { buildAdvisorContext } from '../analytics/advisor-context.js';
import { loadArchivedPortfolios, computeSymbolCagrs } from '../analytics/context-sections.js';
import { streamChat, checkHealth } from '../api.js';
import { showToast } from '../toast.js';
import { emptyStateHTML } from './shared/empty-state.js';
import { escapeHtml } from '../lib/escape.js';

const CATEGORY_HEADING = {
  FACTS: '## Facts', GOALS: '## Goals', CONSTRAINTS: '## Constraints', RISK: '## Risk appetite', QUESTIONS: '## Open questions',
};

const NOTE_PROMPT = `You are a financial adviser's assistant taking case notes on your client, based on the conversation so far. Write 0 to 3 short, factual, third-person statements about the client — no advice, no repeating generic info already obvious from the question. Each statement belongs to exactly one category: FACTS, GOALS, CONSTRAINTS, RISK, QUESTIONS (something still unresolved worth asking later).
Output ONLY one line per statement. Each line starts with the category word itself (FACTS, GOALS, CONSTRAINTS, RISK or QUESTIONS), then a colon, then the statement about this client. For example, a line could look like:
GOALS: The client wants to buy a house within five years.
Never write the word CATEGORY. If there is nothing new and specific to note, output exactly: NONE`;
// The old "CATEGORY: statement text" template made small local models echo the placeholder
// ("CATEGORY: FACTS", no statement) — so nothing parsed and notes silently never saved.
const MAX_NOTES = 3;

async function readContextTokens() {
  const text = await fetch('data/settings.md').then((r) => r.text());
  const m = text.match(/context_tokens:\s*(\d+)/);
  return m ? parseInt(m[1], 10) : 8192;
}

const CATEGORY_ALIASES = {
  FACT: 'FACTS', FACTS: 'FACTS',
  GOAL: 'GOALS', GOALS: 'GOALS',
  CONSTRAINT: 'CONSTRAINTS', CONSTRAINTS: 'CONSTRAINTS',
  RISK: 'RISK', 'RISK APPETITE': 'RISK',
  QUESTION: 'QUESTIONS', QUESTIONS: 'QUESTIONS', 'OPEN QUESTIONS': 'QUESTIONS',
};

// Model replies vary (bullets, bold, numbering, preamble) — normalise each
// line before matching instead of demanding one exact format.
export function parseNotes(raw) {
  const notes = [];
  const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    const cleaned = line.replace(/^[-*\d.#)\s]+/, '').replace(/\*\*/g, '').trim();
    const match = cleaned.match(/^([A-Za-z ]+?):\s*(.+)$/);
    if (!match) continue;
    const category = CATEGORY_ALIASES[match[1].trim().toUpperCase()];
    if (category) notes.push({ category, statement: match[2].trim() });
  }
  return notes;
}

function appendNote(content, category, statement, dateStr, question) {
  const heading = CATEGORY_HEADING[category];
  if (!heading) return { content, ok: false };
  const lines = content.split('\n');
  const headingIdx = lines.findIndex((l) => l.trim() === heading);
  if (headingIdx === -1) return { content, ok: false };
  let insertAt = lines.length;
  for (let i = headingIdx + 1; i < lines.length; i++) {
    if (lines[i].startsWith('## ')) { insertAt = i; break; }
  }
  while (insertAt > headingIdx + 1 && lines[insertAt - 1].trim() === '') insertAt--;
  const truncatedQuestion = question.length > 80 ? `${question.slice(0, 80)}…` : question;
  lines.splice(insertAt, 0, `- [${dateStr}] ${statement} (from: "${truncatedQuestion}")`);
  return { content: lines.join('\n'), ok: true };
}

async function takeNotes(question, answer) {
  const noteMessages = [
    { role: 'system', content: NOTE_PROMPT },
    { role: 'user', content: `Client's question: ${question}\n\nYour answer: ${answer}` },
  ];
  const raw = await streamChat(noteMessages, () => {});
  const notes = parseNotes(raw).slice(0, MAX_NOTES);
  if (notes.length === 0) {
    if (raw.trim().toUpperCase() !== 'NONE') console.warn('takeNotes: no parseable notes in model reply:', raw);
    return { count: 0 };
  }

  const res = await fetch('/api/files?path=private/profile.md');
  const { content } = await res.json();
  const requiredHeadings = Object.values(CATEGORY_HEADING);
  if (!content || !requiredHeadings.every((h) => content.includes(h))) {
    throw new Error('private/profile.md is missing its section headings — restore it from private/profile.md.bak before notes can save.');
  }

  const dateStr = new Date().toISOString().slice(0, 10);
  let updated = content;
  let placed = 0;
  for (const note of notes) {
    const result = appendNote(updated, note.category, note.statement, dateStr, question);
    if (result.ok) { updated = result.content; placed++; }
  }
  if (updated === content) return { count: 0 };
  await fetch('/api/files', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path: 'private/profile.md', content: updated }) });
  return { count: placed };
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

  root.innerHTML = `
    <section class="section">
      <h2 class="section-title">Ask the Advisor</h2>
      <p class="section-hint" id="pipeline-status">Reading holdings…</p>
      <div class="card" id="chat-card" data-style="display:none">
        <p class="section-hint">Running against <strong>${escapeHtml(health.model)}</strong> at ${escapeHtml(health.host)}. Nothing leaves your PC.</p>
        <div class="chat-log" id="chat-log"></div>
        <div class="chat-input-row">
          <textarea id="chat-input" placeholder="Ask about your portfolio… (Enter to send, Shift+Enter for a new line)"></textarea>
          <button class="btn btn-primary" id="chat-send">Send</button>
        </div>
        <details data-style="margin-top:var(--space-md)">
          <summary class="section-hint" data-style="cursor:pointer">Exactly what was sent (<span id="token-summary"></span>)</summary>
          <pre class="editor-textarea" id="sent-context" data-style="white-space:pre-wrap;max-height:300px;overflow-y:auto"></pre>
        </details>
      </div>
    </section>
  `;
  const status = root.querySelector('#pipeline-status');

  status.textContent = 'Loading classification…';
  const [, classification, contextTokens] = await Promise.all([loadFxRates(), loadClassification(), readContextTokens()]);

  status.textContent = 'Loading metrics…';
  const metrics = await loadMetrics();

  status.textContent = 'Loading allocation…';
  const [allocation, transactions] = await Promise.all([loadAllocation(), loadTransactions()]);

  status.textContent = 'Loading history…';
  const progression = await loadArchivedPortfolios();
  const symbolCagrs = computeSymbolCagrs(portfolio.openPositions, transactions, new Date());

  status.textContent = 'Computing risk…';
  const [correlationMatrix, volatilityBySector] = await Promise.all([loadSectorCorrelations(), loadSectorVolatility()]);

  status.textContent = 'Building context…';
  const advisorContext = buildAdvisorContext(portfolio, classification, metrics, contextTokens, {
    allocation, correlationMatrix, volatilityBySector, progression, symbolCagrs, fxAsOf: getFxAsOf(),
  });
  const profileRes = await fetch('/api/files?path=private/profile.md').then((r) => r.json());

  const systemPrompt = `You are a thoughtful financial advisor helping a client understand their own portfolio. Be concise and concrete. Never suggest specific trades to execute; discuss tradeoffs and let the client decide.\n\nWhat you know about the client so far:\n${profileRes.content}\n\n${advisorContext.text}`;
  const history = [{ role: 'system', content: systemPrompt }];

  status.textContent = `Ready — context ${advisorContext.charCount} chars ≈ ${advisorContext.tokenEstimate} tokens (budget ${advisorContext.budgetTokens})${advisorContext.truncated ? ', trimmed to fit' : ''}.`;
  root.querySelector('#chat-card').style.display = '';
  root.querySelector('#token-summary').textContent = `~${advisorContext.tokenEstimate} tokens`;
  root.querySelector('#sent-context').textContent = systemPrompt;

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
    status.textContent = 'Sending…';

    addBubble('user', question);
    history.push({ role: 'user', content: question });

    const assistantEl = addBubble('assistant', '');
    assistantEl.classList.add('streaming');
    status.textContent = 'Generating…';
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
      status.textContent = 'Error — see message above.';
      return;
    }
    assistantEl.classList.remove('streaming');
    history.push({ role: 'assistant', content: answer });
    sendBtn.disabled = false;
    status.textContent = 'Ready.';

    try {
      const { count } = await takeNotes(question, answer);
      if (count > 0) showToast(`📝 Noted ${count} new thing(s) about you — see Advisor → My profile notes`);
    } catch (err) {
      console.error('takeNotes failed:', err);
      showToast(`⚠️ Couldn't save case notes: ${err.message}`);
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

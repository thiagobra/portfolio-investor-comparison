/**
 * @module   views/scenario/history-panel
 * @purpose  Renders deterministic historical-episode cards for the What-if
 *           builder and wires an on-demand local-LLM blind-spot reading.
 *           Never fires automatically — this PC is slow.
 * @exports  renderHistoryPanel(container, ctx)
 * @reads    @js/api.js @js/toast.js @js/lib/escape.js
 * @usedby   @js/views/scenario/results.js
 */

import { streamChat, checkHealth } from '../../api.js';
import { showToast } from '../../toast.js';
import { escapeHtml } from '../../lib/escape.js';

const SEMANTIC_PROMPT = `You are a blunt second opinion on a portfolio what-if scenario. Your job is to name what the person may be missing: blind spots, unexamined assumptions, comfortable stories, and risks that do not show up in the numbers on their screen.

Rules:
- Use ONLY the numbers given below. Never invent a percentage, a date, an index level or a company figure. If you cite history, cite only the episodes listed.
- Do not tell them to buy or sell anything. Name the tradeoff and leave the decision to them.
- Be concrete and short. No disclaimers, no filler, no markdown headings.

Answer in exactly these four labelled sections, plain text:
WHAT THIS BET ASSUMES: one or two sentences on the belief this scenario is implicitly buying.
BLIND SPOTS: 2 to 4 bullets, each one thing the numbers on their screen do NOT show.
HISTORICAL ECHO: tie the scenario to the listed episodes and say plainly what happened, using the given figures.
THE HONEST CASE AGAINST: 2 to 3 bullets, the strongest argument that this scenario is reasonable and the worry is overdone.`;

function scenarioBrief({ before, after, inputs, matches }) {
  const pctOf = (g) => `${g.label} ${(g.weight ?? 0).toFixed(0)}%`;
  const top = (groups) => [...groups].sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0)).slice(0, 5).map(pctOf).join(', ');
  const sold = Object.entries(inputs.sells ?? {}).map(([s, p]) => `${s} ${p}%`).join(', ') || 'nothing';
  const bought = inputs.buyTarget ? `${inputs.buyTarget} at ${inputs.buyWeight}% of the portfolio` : 'nothing';
  const num = (v, d = 2) => (v == null ? 'unknown' : v.toFixed(d));

  const episodes = matches.length
    ? matches.map((m) => `- ${m.episode} (${m.period}): ${m.drawdown} peak-to-trough, recovery ${m.recovery}. What people believed going in: "${m.belief}" Why it was matched: ${m.reasons.join(' ')}`).join('\n')
    : '- (no historical episode was triggered by this scenario)';

  return `THE SCENARIO
Selling: ${sold}
Buying: ${bought}

PORTFOLIO BEFORE
Sectors: ${top(before.sectorGroups)}
HHI ${num(before.hhi, 3)} | effective holdings ${num(before.effectiveN, 1)} | top-10 ${num(before.top10Weight, 0)}% | volatility ${num(before.volatility, 1)}% | beta ${num(before.beta)}

PORTFOLIO AFTER
Sectors: ${top(after.sectorGroups)}
HHI ${num(after.hhi, 3)} | effective holdings ${num(after.effectiveN, 1)} | top-10 ${num(after.top10Weight, 0)}% | volatility ${num(after.volatility, 1)}% | beta ${num(after.beta)}

HISTORICAL EPISODES THIS SCENARIO MATCHED (the only history you may cite)
${episodes}`;
}

export function renderHistoryPanel(container, ctx) {
  const { matches } = ctx;
  const cards = matches.length
    ? matches.map((m) => `
        <div class="stat-card metric-card tone-bad">
          <div class="stat-label">${escapeHtml(m.episode)}</div>
          <div class="stat-value">${escapeHtml(m.drawdown)}</div>
          <div class="metric-verdict tone-bad">Peak to trough ${escapeHtml(m.period)} · back to a new high: ${escapeHtml(m.recovery)}</div>
          <p class="section-hint">What people believed going in: "${escapeHtml(m.belief)}"</p>
          <p class="section-hint">${m.reasons.map((r) => escapeHtml(r)).join(' ')}</p>
        </div>
      `).join('')
    : '';

  container.innerHTML = `
    <section class="section">
      <h2 class="section-title">Has this been tried before?</h2>
      <p class="section-hint">
        Real episodes your simulated portfolio rhymes with, matched on concentration — not predictions.
        Figures come from <code>data/history.md</code> and are editable under Data → History episodes.
      </p>
      ${matches.length
        ? `<div class="stat-grid">${cards}</div>`
        : '<div class="card"><p class="section-hint">No historical concentration analogue triggered — this scenario stays reasonably spread out. You can still ask the model what it thinks you are missing.</p></div>'}
      <div class="actions-row" style="margin-top:var(--space-md)">
        <button class="btn btn-secondary" id="ask-history">🔍 What am I not seeing?</button>
      </div>
      <p class="section-hint" id="history-status">&nbsp;</p>
      <pre class="editor-textarea" id="history-answer" style="white-space:pre-wrap;display:none"></pre>
    </section>
  `;

  const btn = container.querySelector('#ask-history');
  const status = container.querySelector('#history-status');
  const out = container.querySelector('#history-answer');

  btn.addEventListener('click', async () => {
    btn.disabled = true;
    out.style.display = '';
    out.textContent = '';
    status.textContent = 'Checking the local model…';
    try {
      const health = await checkHealth();
      if (!health.reachable) {
        status.textContent = `⚠️ LM Studio isn't reachable at ${health.host}. Check Advisor → Connection.`;
        btn.disabled = false;
        return;
      }
      status.textContent = `Thinking with ${health.model}… this can take a few minutes on this machine.`;
      const messages = [
        { role: 'system', content: SEMANTIC_PROMPT },
        { role: 'user', content: scenarioBrief(ctx) },
      ];
      await streamChat(messages, (delta) => { out.textContent += delta; });
      status.textContent = 'Done. Nothing left your PC.';
    } catch (err) {
      status.textContent = `⚠️ ${err.message}`;
      showToast(`⚠️ Couldn't get a reading: ${err.message}`);
    } finally {
      btn.disabled = false;
    }
  });
}

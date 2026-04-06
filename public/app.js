document.addEventListener('DOMContentLoaded', () => {
  const welcome = document.getElementById('welcome');
  const messagesEl = document.getElementById('messages');
  const messagesInner = document.getElementById('messagesInner');
  const form = document.getElementById('scenarioForm');
  const textarea = document.getElementById('scenarioInput');
  const submitBtn = document.getElementById('submitBtn');
  const drawerOverlay = document.getElementById('drawerOverlay');
  const drawer = document.getElementById('drawer');
  const drawerContent = document.getElementById('drawerContent');
  const closeDrawerBtn = document.getElementById('closeDrawer');
  const entityCount = document.getElementById('entityCount');
  const suggestionBtns = document.querySelectorAll('.suggestion');

  let entities = [];
  let isGenerating = false;

  const tableLabels = {
    'BUT000': 'Business Partner',
    'FKKVKP': 'Contract Account',
    'EANL': 'Installation',
    'EGER': 'Device',
    'EABL': 'Meter Reading',
    'EVER': 'Supply Contract',
    'ETTIFN': 'Move-In/Out Document',
    'ERDK': 'Billing Document',
    'VALIDATION': 'Validation Result'
  };

  // ─── Auto-resize textarea ───
  function autoResize() {
    textarea.style.height = 'auto';
    const h = Math.min(textarea.scrollHeight, 160);
    textarea.style.height = (h > 36 ? h : 36) + 'px';
  }
  textarea.addEventListener('input', autoResize);

  // ─── Enter to send ───
  textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      form.requestSubmit();
    }
  });

  // ─── Suggestion chips ───
  suggestionBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      textarea.value = btn.dataset.text;
      autoResize();
      textarea.focus();
    });
  });

  // ─── Drawer ───
  function openDrawer() {
    drawer.hidden = false;
    drawerOverlay.hidden = false;
  }
  function closeDrawer() {
    drawer.hidden = true;
    drawerOverlay.hidden = true;
  }
  closeDrawerBtn.addEventListener('click', closeDrawer);
  drawerOverlay.addEventListener('click', closeDrawer);

  // ─── Render Helpers ───
  function addRoleMessage(role, content) {
    const div = document.createElement('div');
    div.className = 'msg-role';

    const avatar = document.createElement('div');
    avatar.className = 'msg-avatar ' + role;
    avatar.textContent = role === 'user' ? 'U' : 'A';

    const body = document.createElement('div');
    body.className = 'msg-body';

    if (role !== 'user') {
      const label = document.createElement('div');
      label.className = 'msg-role-label';
      label.textContent = role === 'assistant' ? 'Agent' : 'Tool';
      body.appendChild(label);
    }

    const text = document.createElement('div');
    text.className = 'msg-content';
    text.textContent = content;
    body.appendChild(text);

    div.appendChild(avatar);
    div.appendChild(body);
    messagesInner.appendChild(div);
  }

  function addToolCall(toolName, args, resultStr) {
    const div = document.createElement('div');
    div.className = 'msg-role';

    const avatar = document.createElement('div');
    avatar.className = 'msg-avatar tool-icon';
    avatar.textContent = '⚙';

    const body = document.createElement('div');
    body.className = 'msg-body';

    const label = document.createElement('div');
    label.className = 'msg-role-label';
    label.textContent = 'Tool';
    body.appendChild(label);

    const block = document.createElement('div');
    block.className = 'tool-block';

    const summary = document.createElement('div');
    summary.className = 'tool-block-summary';
    summary.textContent = `${toolName}(${args})`;
    block.appendChild(summary);

    const result = document.createElement('div');
    result.className = 'tool-block-result';
    result.textContent = resultStr;
    block.appendChild(result);

    body.appendChild(block);
    div.appendChild(avatar);
    div.appendChild(body);
    messagesInner.appendChild(div);
  }

  function addThinking() {
    const div = document.createElement('div');
    div.className = 'msg-role';
    div.id = 'thinkingIndicator';

    const avatar = document.createElement('div');
    avatar.className = 'msg-avatar assistant';
    avatar.textContent = 'A';

    const body = document.createElement('div');
    body.className = 'msg-body';

    const label = document.createElement('div');
    label.className = 'msg-role-label';
    label.textContent = 'Agent';
    body.appendChild(label);

    const dots = document.createElement('div');
    dots.className = 'thinking';
    dots.innerHTML = '<span></span><span></span><span></span>';
    body.appendChild(dots);

    div.appendChild(avatar);
    div.appendChild(body);
    messagesInner.appendChild(div);
  }

  function removeThinking() {
    const el = document.getElementById('thinkingIndicator');
    if (el) el.remove();
  }

  function addViewDataButton() {
    const existing = document.getElementById('viewDataWrapper');
    if (existing) return;

    const div = document.createElement('div');
    div.className = 'msg-role';
    div.id = 'viewDataWrapper';

    const avatar = document.createElement('div');
    avatar.className = 'msg-avatar assistant';
    avatar.textContent = 'A';

    const body = document.createElement('div');
    body.className = 'msg-body';

    const label = document.createElement('div');
    label.className = 'msg-role-label';
    label.textContent = 'Agent';
    body.appendChild(label);

    const btn = document.createElement('button');
    btn.className = 'view-data-cta';
    btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="14" height="14" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M1 6h14" stroke="currentColor" stroke-width="1.5"/></svg> View generated data (${entities.length} entities)`;
    btn.addEventListener('click', () => {
      renderDrawer();
      openDrawer();
    });
    body.appendChild(btn);

    div.appendChild(avatar);
    div.appendChild(body);
    messagesInner.appendChild(div);
  }

  function addError(msg) {
    const div = document.createElement('div');
    div.className = 'error-msg';
    div.textContent = msg;
    messagesInner.appendChild(div);
  }

  function scrollToBottom() {
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  // ─── Drawer Rendering ───
  function renderDrawer() {
    entityCount.textContent = entities.length + ' entities';
    drawerContent.innerHTML = '';

    if (!entities.length) {
      drawerContent.innerHTML = '<p style="color:var(--text-muted);font-size:.875rem;">No data yet.</p>';
      return;
    }

    const groups = {};
    entities.forEach(e => {
      const t = e.table || 'OTHER';
      if (!groups[t]) groups[t] = [];
      groups[t].push(e);
    });

    for (const [table, rows] of Object.entries(groups)) {
      const clean = rows.map(r => { const c = {...r}; delete c.table; return c; });
      if (!clean.length) continue;
      const cols = Object.keys(clean[0]);

      const card = document.createElement('div');
      card.className = 'draw-table-card';

      const header = document.createElement('div');
      header.className = 'draw-table-header';
      const label = tableLabels[table] || table;
      header.innerHTML = `<span>${label} — ${table} (${clean.length} rows)</span>`;
      const expBtn = document.createElement('button');
      expBtn.className = 'export-btn';
      expBtn.textContent = 'Export .xlsx';
      expBtn.addEventListener('click', () => downloadSheet(table, clean));
      header.appendChild(expBtn);
      card.appendChild(header);

      const scroll = document.createElement('div');
      scroll.className = 'draw-table-scroll';

      const tbl = document.createElement('table');
      const thead = document.createElement('thead');
      const hr = document.createElement('tr');
      cols.forEach(c => { const th = document.createElement('th'); th.textContent = c; hr.appendChild(th); });
      thead.appendChild(hr);
      tbl.appendChild(thead);

      const tbody = document.createElement('tbody');
      clean.forEach(row => {
        const tr = document.createElement('tr');
        cols.forEach(c => { const td = document.createElement('td'); td.textContent = row[c] ?? ''; tr.appendChild(td); });
        tbody.appendChild(tr);
      });
      tbl.appendChild(tbody);
      scroll.appendChild(tbl);
      card.appendChild(scroll);
      drawerContent.appendChild(card);
    }
  }

  function downloadSheet(table, rows) {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, table);
    XLSX.writeFile(wb, `${table}_Export.xlsx`);
  }

  // ─── Submit ───
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const scenario = textarea.value.trim();
    if (!scenario || isGenerating) return;

    // Transition from welcome → chat
    welcome.style.display = 'none';
    messagesEl.hidden = false;

    addRoleMessage('user', scenario);
    textarea.value = '';
    textarea.style.height = 'auto';
    isGenerating = true;
    submitBtn.disabled = true;

    // Remove old View Data CTA (will add new one if applicable)
    const oldCta = document.getElementById('viewDataWrapper');
    if (oldCta) oldCta.remove();

    addThinking();
    scrollToBottom();

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario, database: 'data.sqlite' })
      });

      const data = await response.json();
      removeThinking();

      if (!response.ok || !data.success) {
        addError(`Error: ${data.error || 'Failed to generate'}`);
      } else {
        // Process messages
        data.messages.forEach(msg => {
          if (msg.role === 'system') return;
          if (msg.role === 'user') return; // already shown

          if (msg.role === 'assistant') {
            if (msg.content) addRoleMessage('assistant', msg.content);
            if (msg.tool_calls) {
              // tool calls shown inline
              msg.tool_calls.forEach(tc => {
                const argsStr = tc.function.arguments;
                try {
                  const p = JSON.parse(argsStr);
                  addToolCall(tc.function.name, JSON.stringify(p).slice(0, 120), '');
                } catch {
                  addToolCall(tc.function.name, argsStr.slice(0, 80), '');
                }
              });
            }
          } else if (msg.role === 'tool') {
            // append result to last tool-block
            const blocks = messagesInner.querySelectorAll('.tool-block-result');
            if (blocks.length > 0) {
              const last = blocks[blocks.length - 1];
              const parsed = (() => { try { return JSON.stringify(JSON.parse(msg.content), null, 2); } catch { return msg.content; } })();
              last.textContent = parsed;
            }
          }
        });

        // Accumulate entities
        if (data.entities && data.entities.length > entities.length) {
          entities = data.entities.map(e => e.data);
          addViewDataButton();
        }
      }
    } catch (err) {
      removeThinking();
      addError(`Network error: ${err.message}`);
    } finally {
      isGenerating = false;
      submitBtn.disabled = false;
      scrollToBottom();
    }
  });
});

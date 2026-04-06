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
  const exportAllBtn = document.getElementById('exportAllBtn');
  const suggestionBtns = document.querySelectorAll('.suggestion');

  let entities = [];
  let isGenerating = false;
  let timerInterval = null;

  const tableLabels = {
    'BUT000': 'Business Partner',
    'FKKVKP': 'Contract Account',
    'EHAUS': 'Premise',
    'ICONNOBJ': 'Connection Object',
    'EANL': 'Installation',
    'EGER': 'Device',
    'EABL': 'Meter Reading',
    'EVER': 'Supply Contract',
    'ERDK': 'Billing Document',
    'VALIDATION': 'Validation Result'
  };

  const toolLabels = {
    'create_business_partner': { label: 'Create Business Partner', icon: '\ud83d\udc64' },
    'create_contract_account': { label: 'Create Contract Account', icon: '\ud83d\udcdd' },
    'create_premise': { label: 'Create Premise', icon: '\ud83c\udfe2' },
    'create_connection_object': { label: 'Create Connection Object', icon: '\ud83d\udd0c' },
    'create_installation': { label: 'Create Installation', icon: '\ud83c\udfe0' },
    'create_device': { label: 'Create Device', icon: '\ud83d\udce1' },
    'create_meter_reading': { label: 'Create Meter Reading', icon: '\ud83d\udccf' },
    'move_in': { label: 'Move-In', icon: '\ud83d\udce5' },
    'move_out': { label: 'Move-Out', icon: '\ud83d\udce4' },
    'create_billing_document': { label: 'Create Billing Document', icon: '\ud83d\udcb0' },
    'validate_scenario': { label: 'Validate Scenario', icon: '\u2705' }
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

  // ─── Loading Timer ───
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

    const timerRow = document.createElement('div');
    timerRow.className = 'thinking-row';

    const dots = document.createElement('div');
    dots.className = 'thinking';
    dots.innerHTML = '<span></span><span></span><span></span>';
    timerRow.appendChild(dots);

    const timerEl = document.createElement('span');
    timerEl.className = 'thinking-timer';
    timerEl.id = 'thinkingTimer';
    timerEl.textContent = 'Generating... 0s';
    timerRow.appendChild(timerEl);

    body.appendChild(timerRow);
    div.appendChild(avatar);
    div.appendChild(body);
    messagesInner.appendChild(div);

    let seconds = 0;
    timerInterval = setInterval(() => {
      seconds++;
      timerEl.textContent = `Generating... ${seconds}s`;
    }, 1000);
  }

  function removeThinking() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    const el = document.getElementById('thinkingIndicator');
    if (el) el.remove();
  }

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

  function addToolCard(toolName, args, resultStr, isSuccess) {
    const info = toolLabels[toolName] || { label: toolName, icon: '\u2699\ufe0f' };

    const div = document.createElement('div');
    div.className = 'msg-role';

    const avatar = document.createElement('div');
    avatar.className = 'msg-avatar tool-icon';
    avatar.textContent = info.icon;

    const body = document.createElement('div');
    body.className = 'msg-body';

    const card = document.createElement('div');
    card.className = 'tool-card';

    // Header row: badge + status
    const header = document.createElement('div');
    header.className = 'tool-card-header';

    const badge = document.createElement('span');
    badge.className = 'tool-card-badge';
    badge.textContent = info.label;
    header.appendChild(badge);

    const status = document.createElement('span');
    status.className = 'tool-card-status ' + (isSuccess ? 'success' : 'error');
    status.textContent = isSuccess ? '\u2713 Success' : '\u2717 Retrying...';
    header.appendChild(status);

    card.appendChild(header);

    // Key params summary
    if (args && isSuccess) {
      const paramsSummary = document.createElement('div');
      paramsSummary.className = 'tool-card-params';
      try {
        const parsed = JSON.parse(args);
        const keys = Object.keys(parsed).slice(0, 4);
        const parts = keys.map(k => {
          const v = typeof parsed[k] === 'object' ? '...' : parsed[k];
          return `${k}: ${v}`;
        });
        paramsSummary.textContent = parts.join('  \u00b7  ');
      } catch {
        paramsSummary.textContent = args.slice(0, 80);
      }
      card.appendChild(paramsSummary);
    }

    // Collapsible result
    if (resultStr) {
      const toggle = document.createElement('button');
      toggle.className = 'tool-card-toggle';
      toggle.textContent = '\u25b6 Show details';
      const resultDiv = document.createElement('div');
      resultDiv.className = 'tool-card-result';
      resultDiv.hidden = true;

      try {
        resultDiv.textContent = JSON.stringify(JSON.parse(resultStr), null, 2);
      } catch {
        resultDiv.textContent = resultStr;
      }

      toggle.addEventListener('click', () => {
        resultDiv.hidden = !resultDiv.hidden;
        toggle.textContent = resultDiv.hidden ? '\u25b6 Show details' : '\u25bc Hide details';
      });

      card.appendChild(toggle);
      card.appendChild(resultDiv);
    }

    body.appendChild(card);
    div.appendChild(avatar);
    div.appendChild(body);
    messagesInner.appendChild(div);
  }

  function addGroupedToolCard(toolName, calls) {
    const info = toolLabels[toolName] || { label: toolName, icon: '\u2699\ufe0f' };

    const div = document.createElement('div');
    div.className = 'msg-role';

    const avatar = document.createElement('div');
    avatar.className = 'msg-avatar tool-icon';
    avatar.textContent = info.icon;

    const body = document.createElement('div');
    body.className = 'msg-body';

    const card = document.createElement('div');
    card.className = 'tool-card';

    // Header
    const header = document.createElement('div');
    header.className = 'tool-card-header';

    const badge = document.createElement('span');
    badge.className = 'tool-card-badge';
    badge.textContent = info.label;
    header.appendChild(badge);

    const countBadge = document.createElement('span');
    countBadge.className = 'tool-card-status success';
    countBadge.textContent = calls.length === 1 ? '\u2713 Success' : `\u2713 ${calls.length} created`;
    header.appendChild(countBadge);

    card.appendChild(header);

    // If single call, show params inline
    if (calls.length === 1) {
      const paramsSummary = document.createElement('div');
      paramsSummary.className = 'tool-card-params';
      try {
        const parsed = JSON.parse(calls[0].args);
        const keys = Object.keys(parsed).slice(0, 4);
        const parts = keys.map(k => {
          const v = typeof parsed[k] === 'object' ? '...' : parsed[k];
          return `${k}: ${v}`;
        });
        paramsSummary.textContent = parts.join('  \u00b7  ');
      } catch {
        paramsSummary.textContent = calls[0].args.slice(0, 80);
      }
      card.appendChild(paramsSummary);
    }

    // Collapsible details
    const toggle = document.createElement('button');
    toggle.className = 'tool-card-toggle';
    toggle.textContent = calls.length === 1 ? '\u25b6 Show details' : `\u25b6 Show ${calls.length} results`;
    const detailsDiv = document.createElement('div');
    detailsDiv.className = 'tool-card-result';
    detailsDiv.hidden = true;

    const allResults = calls.map((c, i) => {
      try {
        const parsed = JSON.parse(c.result);
        return JSON.stringify(parsed.data || parsed, null, 2);
      } catch {
        return c.result;
      }
    });
    detailsDiv.textContent = allResults.join('\n\n---\n\n');

    toggle.addEventListener('click', () => {
      detailsDiv.hidden = !detailsDiv.hidden;
      toggle.textContent = detailsDiv.hidden
        ? (calls.length === 1 ? '\u25b6 Show details' : `\u25b6 Show ${calls.length} results`)
        : (calls.length === 1 ? '\u25bc Hide details' : `\u25bc Hide ${calls.length} results`);
    });

    card.appendChild(toggle);
    card.appendChild(detailsDiv);

    body.appendChild(card);
    div.appendChild(avatar);
    div.appendChild(body);
    messagesInner.appendChild(div);
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
    const count = entities.filter(e => e.table !== 'VALIDATION').length;
    btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="14" height="14" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M1 6h14" stroke="currentColor" stroke-width="1.5"/></svg> View generated data (${count} entities)`;
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
    const realEntities = entities.filter(e => e.table !== 'VALIDATION');
    entityCount.textContent = realEntities.length + ' entities';
    drawerContent.innerHTML = '';

    if (!realEntities.length) {
      drawerContent.innerHTML = '<p style="color:var(--text-muted);font-size:.875rem;">No data yet.</p>';
      exportAllBtn.hidden = true;
      return;
    }

    exportAllBtn.hidden = false;

    const groups = {};
    realEntities.forEach(e => {
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
      const tblLabel = tableLabels[table] || table;
      header.innerHTML = `<span>${tblLabel} \u2014 ${table} (${clean.length} rows)</span>`;
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

  // ─── Export All ───
  function downloadAll() {
    if (!entities.length) return;
    const wb = XLSX.utils.book_new();
    const groups = {};
    entities.forEach(e => {
      const t = e.table || 'OTHER';
      if (t === 'VALIDATION') return;
      if (!groups[t]) groups[t] = [];
      groups[t].push(e);
    });
    for (const [table, rows] of Object.entries(groups)) {
      const clean = rows.map(r => { const c = {...r}; delete c.table; return c; });
      if (!clean.length) continue;
      const ws = XLSX.utils.json_to_sheet(clean);
      XLSX.utils.book_append_sheet(wb, ws, table.slice(0, 31));
    }
    XLSX.writeFile(wb, 'ISU_TestData_Export.xlsx');
  }
  exportAllBtn.addEventListener('click', downloadAll);

  // ─── Submit ───
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const scenario = textarea.value.trim();
    if (!scenario || isGenerating) return;

    welcome.style.display = 'none';
    messagesEl.hidden = false;

    addRoleMessage('user', scenario);
    textarea.value = '';
    textarea.style.height = 'auto';
    isGenerating = true;
    submitBtn.disabled = true;

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
        // Collect successful tool calls grouped by tool name
        const grouped = {};
        let pendingToolCalls = [];
        let lastAssistantContent = '';

        data.messages.forEach(msg => {
          if (msg.role === 'system' || msg.role === 'user') return;

          if (msg.role === 'assistant') {
            if (msg.content) lastAssistantContent = msg.content;
            if (msg.tool_calls) {
              msg.tool_calls.forEach(tc => pendingToolCalls.push(tc));
            }
          } else if (msg.role === 'tool') {
            const matchIdx = pendingToolCalls.findIndex(tc => tc.id === msg.tool_call_id);
            const tc = matchIdx >= 0 ? pendingToolCalls.splice(matchIdx, 1)[0] : null;

            let isSuccess = false;
            try {
              const parsed = JSON.parse(msg.content);
              isSuccess = parsed.success === true;
            } catch {}

            if (!isSuccess) return;

            const toolName = tc ? tc.function.name : 'unknown';
            if (toolName === 'validate_scenario') return;

            if (!grouped[toolName]) grouped[toolName] = [];
            grouped[toolName].push({
              args: tc ? tc.function.arguments : '',
              result: msg.content
            });
          }
        });

        // Render grouped tool summary cards
        for (const [toolName, calls] of Object.entries(grouped)) {
          addGroupedToolCard(toolName, calls);
        }

        // Show final assistant message
        if (lastAssistantContent) {
          addRoleMessage('assistant', lastAssistantContent);
        }

        // Accumulate entities
        if (data.entities && data.entities.length) {
          const flat = [];
          data.entities.forEach(e => {
            if (Array.isArray(e.data)) {
              e.data.forEach(d => flat.push(d));
            } else {
              flat.push(e.data);
            }
          });
          entities = flat;
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

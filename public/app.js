document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('scenarioForm');
  const input = document.getElementById('scenarioInput');
  const submitBtn = document.getElementById('submitBtn');
  const messagesContainer = document.getElementById('messagesContainer');
  const tablesContainer = document.getElementById('tablesContainer');
  
  let currentEntities = [];

  function addMessage(text, type) {
    const el = document.createElement('div');
    el.className = `message ${type}-message`;
    el.textContent = text;
    messagesContainer.appendChild(el);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const scenario = input.value.trim();
    if (!scenario) return;

    // Reset input and disable UI
    input.value = '';
    submitBtn.disabled = true;
    submitBtn.textContent = 'Generating...';
    
    addMessage(scenario, 'user');

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ scenario, database: 'data.sqlite' })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        addMessage(`Error: ${data.error || 'Failed to generate'}`, 'system');
      } else {
        // Output conversation history (excluding system prompt to save space)
        data.messages.forEach(msg => {
          if (msg.role === 'system') return;
          if (msg.role === 'user') return; // we already appended it

          if (msg.role === 'assistant') {
            if (msg.content) addMessage(msg.content, 'assistant');
            if (msg.tool_calls) {
              msg.tool_calls.forEach(tc => {
                 addMessage(`Calling Tool [${tc.function.name}] with ${tc.function.arguments}`, 'tool');
              });
            }
          } else if (msg.role === 'tool') {
            addMessage(`Tool Result: ${msg.content}`, 'tool');
          }
        });

        // Process entities into tables
        currentEntities = data.entities.map(e => e.data);
        renderTables(currentEntities);
      }
    } catch (err) {
      addMessage(`Network error: ${err.message}`, 'system');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Generate';
    }
  });

  function renderTables(entities) {
    if (!entities || entities.length === 0) {
      tablesContainer.innerHTML = `<p style="color: var(--text-muted); font-size: 0.85rem; padding: 10px;">No entities generated yet.</p>`;
      return;
    }

    const groups = {};
    entities.forEach(entity => {
      const table = entity.table || 'OTHER';
      if (!groups[table]) groups[table] = [];
      groups[table].push(entity);
    });

    tablesContainer.innerHTML = '';

    for (const [table, rows] of Object.entries(groups)) {
      const cleanRows = rows.map(r => {
        const copy = { ...r };
        delete copy.table;
        return copy;
      });

      if (cleanRows.length === 0) continue;
      const columns = Object.keys(cleanRows[0]);

      const wrapper = document.createElement('div');
      wrapper.className = 'table-wrapper';

      const header = document.createElement('div');
      header.className = 'table-wrapper-header';
      header.innerHTML = `<h3>${table}</h3><button class="download-single-btn" data-table="${table}">Download .xlsx</button>`;
      
      const responsiveDiv = document.createElement('div');
      responsiveDiv.className = 'table-responsive';

      const tableEl = document.createElement('table');
      tableEl.className = 'hana-table';

      // Thead
      const thead = document.createElement('thead');
      const headerRow = document.createElement('tr');
      columns.forEach(col => {
        const th = document.createElement('th');
        th.textContent = col;
        headerRow.appendChild(th);
      });
      thead.appendChild(headerRow);
      tableEl.appendChild(thead);

      // Tbody
      const tbody = document.createElement('tbody');
      cleanRows.forEach(rowData => {
        const tr = document.createElement('tr');
        columns.forEach(col => {
          const td = document.createElement('td');
          td.textContent = rowData[col] !== undefined && rowData[col] !== null ? rowData[col] : '';
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });
      tableEl.appendChild(tbody);

      responsiveDiv.appendChild(tableEl);
      wrapper.appendChild(header);
      wrapper.appendChild(responsiveDiv);

      tablesContainer.appendChild(wrapper);

      // Bind Export Event
      header.querySelector('.download-single-btn').addEventListener('click', () => {
        downloadSheet(table, cleanRows);
      });
    }
  }

  function downloadSheet(tableName, rows) {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, tableName);
    XLSX.writeFile(wb, `${tableName}_Export.xlsx`);
  }
});

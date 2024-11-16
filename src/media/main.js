// main.js
(function () {
    const vscode = acquireVsCodeApi();
  
    document.getElementById('switchButton').addEventListener('click', () => {
      vscode.postMessage({ command: 'switchToText' });
    });
  
    // Handle tree expand/collapse
    document.querySelectorAll('tr[data-expander="true"]').forEach((row) => {
      const expander = row.querySelector('.expander');
      expander.addEventListener('click', () => {
        const level = parseInt(row.dataset.level, 10);
        let nextRow = row.nextElementSibling;
  
        const isCollapsed = row.classList.toggle('collapsed');
        expander.textContent = isCollapsed ? '▶' : '▼';
  
        while (nextRow && parseInt(nextRow.dataset.level, 10) > level) {
          if (isCollapsed) {
            nextRow.style.display = 'none';
            nextRow.classList.add('collapsed');
            const nextExpander = nextRow.querySelector('.expander');
            if (nextExpander) {
              nextExpander.textContent = '▶';
            }
          } else {
            if (parseInt(nextRow.dataset.level, 10) === level + 1) {
              nextRow.style.display = 'table-row';
            }
          }
          nextRow = nextRow.nextElementSibling;
        }
      });
    });
  })();
  
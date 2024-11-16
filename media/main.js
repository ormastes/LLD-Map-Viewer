// main.js
(function () {
  const vscode = acquireVsCodeApi();

  document.getElementById('switchButton').addEventListener('click', () => {
    vscode.postMessage({ command: 'switchToText' });
  });

  // Listen for number format changes
  document.querySelectorAll('input[name="numberFormat"]').forEach((radio) => {
    radio.addEventListener('change', () => {
        const format = document.querySelector('input[name="numberFormat"]:checked').value;
        vscode.postMessage({ command: 'numberFormatChanged', format });
      });
  });

  // Handle tree expand/collapse
  document.querySelectorAll('tr[data-expander="true"]').forEach((row) => {
    const expander = row.querySelector('.expander');
    expander.addEventListener('click', () => {
      const rowId = row.getAttribute('data-node-id');
      const isPrevCollapsed = row.classList.contains('collapsed');
      if (isPrevCollapsed) {
        row.classList.remove('collapsed');
      } else {
        row.classList.add('collapsed');
      }

      expander.textContent = !isPrevCollapsed ? '▶' : '▼';

      toggleChildRows(rowId, !isPrevCollapsed);
    });
    // cause click event to be triggered on the expander
    row.classList.add('collapsed');
  });

  function toggleChildRows(parentId, hide) {
    const childRows = document.querySelectorAll(`tr[data-parent-id='${parentId}']`);
    childRows.forEach((childRow) => {
      if (hide) {
        childRow.style.display = 'none';
      } else {
        childRow.style.display = 'table-row';
      }

      const childExpander = childRow.querySelector('.expander');
      const childRowId = childRow.getAttribute('data-node-id');

      if (childExpander) {
        if (hide) {
          if (!childRow.classList.contains('collapsed')) {
            childRow.classList.add('collapsed');
            childExpander.textContent = '▶';
          }
        } else {
          if (childRow.classList.contains('collapsed')) {
            childRow.classList.remove('collapsed');
            childExpander.textContent = '▼';
          }
        }
      }

      // Recursively toggle child rows
      toggleChildRows(childRowId, hide);
    });
  }


})();
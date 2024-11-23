// main.js
(function () {
  const vscode = acquireVsCodeApi();
  let selectedRowId = null;

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
      const childHide = hide || true;

      if (childExpander) {
        if (childHide) {
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
      toggleChildRows(childRowId, childHide);
    });
  }

  // Handle row selection
  document.querySelectorAll('#productTable tbody tr').forEach((row) => {
    row.addEventListener('click', () => {
      // Remove 'selected' class from all rows
      document.querySelectorAll('#productTable tbody tr').forEach((r) => {
        r.classList.remove('selected');
      });
      // Add 'selected' class to the clicked row
      row.classList.add('selected');
      selectedRowId = row.getAttribute('data-node-id');
    });
  });

  // Handle the Open Pie Chart button
  document.getElementById('openChartButton').addEventListener('click', () => {
    vscode.postMessage({ command: 'requestChartData', nodeId: selectedRowId });
  });

  // Listen for messages from the extension
  window.addEventListener('message', event => {
    const message = event.data;
    switch (message.command) {
      case 'displayChart':
        displayChart(message.chartData);
        break;
      // Other cases...
    }
  });

  function displayChart(chartData) {
    try {
        // Show the chart container
        document.getElementById('chartContainer').style.display = 'block';
        
        // Get the context of the canvas
        const ctx = document.getElementById('pieChart').getContext('2d');
        
        // Destroy existing chart instance if it exists to prevent overlay
        if (pieChartInstance) {
            pieChartInstance.destroy();
        }

        // Log chart data for debugging
        console.log('Creating new chart with data:', chartData);

        // Create the pie chart
        pieChartInstance = new Chart(ctx, {
            type: 'pie',
            data: chartData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    title: {
                        display: true,
                        text: 'Child Nodes Pie Chart'
                    }
                }
            }
        });

        // Log success
        console.log('Pie chart created successfully.');
    } catch (error) {
        console.error('Error creating pie chart:', error);
    }
}

  // Handle Close Chart button
  document.getElementById('closeChartButton').addEventListener('click', () => {
    document.getElementById('chartContainer').style.display = 'none';
  });


})();
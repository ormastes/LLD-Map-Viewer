// MapFileEditor.ts
import * as vscode from 'vscode';
import { TreeNode } from './TreeNode';
import assert from 'assert';

export class MapFileEditor implements vscode.CustomTextEditorProvider {
  public static readonly viewType = 'lldMapView.editor';
  private root: TreeNode;

  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    const provider = new MapFileEditor(context);
    const providerRegistration = vscode.window.registerCustomEditorProvider(
      MapFileEditor.viewType,
      provider
    );
    return providerRegistration;
  }

  constructor(private readonly context: vscode.ExtensionContext) {
    this.root = new TreeNode('', '', '', '', '', -1);
    this.root.id = 'root';
    this.root.expanded = true;
   }

  public async resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken
  ): Promise<void> {
    // Set up the webview content
    webviewPanel.webview.options = {
      enableScripts: true,
    };

    // Initial content load
    this.updateWebviewContent(document, webviewPanel.webview);

    // Listen for document changes
    const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument((e) => {
      if (e.document.uri.toString() === document.uri.toString()) {
        this.updateWebviewContent(document, webviewPanel.webview);
      }
    });

    // Clean up
    webviewPanel.onDidDispose(() => {
      changeDocumentSubscription.dispose();
    });

    // Handle messages from the webview
    webviewPanel.webview.onDidReceiveMessage((message) => {
      switch (message.command) {
        case 'switchToText':
          vscode.commands.executeCommand('vscode.openWith', document.uri, 'default');
          return;
        case 'numberFormatChanged':
          TreeNode.currentNumberFormat = message.format;
          webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview, this.root);
          return;
        case 'requestChartData':
          const nodeId = message.nodeId;
          const chartData = this.getChartData(nodeId);
          webviewPanel.webview.postMessage({ command: 'displayChart', chartData });
          break;
    }
    });
  }
  // Helper method to find node by ID
  private findNodeById(nodeId: string, nodes: TreeNode[]): TreeNode | null {
    for (const node of nodes) {
      if (node.id === nodeId) {
        return node;
      }
      const childNode = this.findNodeById(nodeId, node.children);
      if (childNode) {
        return childNode;
      }
    }
    return null;
  }
  // Method to generate colors for the chart
  private generateColors(count: number): string[] {
    const colors = [];
    for (let i = 0; i < count; i++) {
      colors.push(`hsl(${Math.floor((i * 360) / count)}, 70%, 50%)`);
    }
    return colors;
  }
  // Method to get chart data
  private getChartData(nodeId: string | null): any {
    let targetNode: TreeNode;
    if (nodeId) {
      targetNode = this.findNodeById(nodeId, this.root.children) || this.root;
    } else {
      targetNode = this.root;
    }
    const labels = targetNode.children.map(child => child.getSymbol());
    const data = targetNode.children.map(child => child.getSizeNumber());

    let result = {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: this.generateColors(targetNode.children.length)
      }]
    };
    return result;
  }

  private updateWebviewContent(document: vscode.TextDocument, webview: vscode.Webview) {
    const data = this.parseMapFile(document.getText());
    webview.html = this.getHtmlForWebview(webview, data);
  }

  private parseBySpace(text: string): [string[], number[]] {
    let data: string[] = [];
    let spaceList: number[] = [];
    let space = 0;
    let curText = '';
    let idx = 0;
    while (idx < text.length) {
      while ((text[idx] === ' ' || text[idx] === '\t') && idx < text.length) {
        space += 1;
        idx += 1;
      }
      while (text[idx] !== ' ' && text[idx] !== '\n' && text[idx] !== '\r' && idx < text.length) {
        if (text[idx] !== '<' && text[idx] !== '>') {
          curText += text[idx];
        }
        idx += 1;
      }
      while ((text[idx] === '\n' || text[idx] === '\r') && idx < text.length) {
        idx += 1;
      }
      data.push(curText);
      spaceList.push(space);
      space = 0;
      curText = '';
    }
    return [data, spaceList];
  }

  private parseMapFile(text: string): TreeNode {
    const lines = text.split('\n');
    const rootNodes: TreeNode[] = this.root.children;
    const stack: { indent: number; node: TreeNode }[] = [];

    const [labels, base_spaces] = this.parseBySpace(lines[0]);
    const label_loc_map: { [key: string]: number } = {
      'VMA': 0, 'LMA': 1, 'Size': 2, 'Align': 3, 'Symbol': 6
    };
    let base_indent = -1;
    let tab_indent = -1;
    // check label location
    for (let i = 0; i < Object.keys(label_loc_map).length; i++) {
      // ignore case
      const defined_label = Object.keys(label_loc_map)[i];
      const defined_idx = label_loc_map[defined_label];
      if (labels[defined_idx].toLowerCase() !== defined_label.toLowerCase()) {
        // vscode extension error message
        vscode.window.showErrorMessage(`Map file format error: ${labels[defined_idx]} should be ${defined_label}`);
      }
    }

    // skip the first line
    const content = lines.slice(1);

    for (const line of content) {
      if (line.trim() === '') {
        continue; // Skip empty lines
      }
      const [data, spaces] = this.parseBySpace(line);
      const indent = spaces[(label_loc_map['Symbol'] >= data.length) ? data.length - 1 : label_loc_map['Symbol']];
      assert(indent >= 0, 'Indent should be non-negative');

      if (base_indent === -1) {
        base_indent = indent;
      }
      if (base_indent !== indent) {
        tab_indent = indent - base_indent;
      }
      const tab = (tab_indent === -1) ? 0 : (indent - base_indent) / tab_indent;
      const symbol = data[(label_loc_map['Symbol'] >= data.length) ? data.length - 1 : label_loc_map['Symbol']];
      const size = data[label_loc_map['Size']];
      const align = data[label_loc_map['Align']];
      const vma = data[label_loc_map['VMA']];
      const lma = data[label_loc_map['LMA']];

      const node = new TreeNode(symbol, size, align, vma, lma, tab);

      while (stack.length > 0 && indent <= stack[stack.length - 1].indent) {
        stack.pop();
      }

      if (stack.length === 0) {
        rootNodes.push(node);
      } else {
        stack[stack.length - 1].node.children.push(node);
      }

      stack.push({ indent, node });
    }

    return this.root;
  }

  private getHtmlForWebview(webview: vscode.Webview, data: TreeNode): string {
    const nonce = getNonce();
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'media', 'main.js')
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'media', 'styles.css')
    );

    // Generate the tree table rows
    const tableRows = this.generateTableRows(data, data.children);
    //log html
    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">

        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link href="${styleUri}" rel="stylesheet">
        <title>LLD Map View</title>
      </head>
      <body>
        <div>
          <button id="switchButton">Switch to Text Editor</button>
            <label>
                <input type="radio" name="numberFormat" value="hex" ${TreeNode.currentNumberFormat === 'hex' ? 'checked' : ''}> Hex
            </label>
            <label>
                <input type="radio" name="numberFormat" value="decimal" ${TreeNode.currentNumberFormat === 'decimal' ? 'checked' : ''}> Decimal
            </label>
            <button id="openChartButton">Open Pie Chart</button>
        </div>
        <table id="productTable">
          <thead>
            <tr>
              <th>Symbol</th>
              <th>Size</th>
              <th>Align</th>
              <th>VMA</th>
              <th>LMA</th>
            </tr>
            <tr hidden data-node-id="${data.id}" parent=""></tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
        <!-- Container for the chart -->
        <div id="chartContainer" style="display: none;">
          <canvas id="pieChart" width="400" height="400"></canvas>
          <button id="closeChartButton">Close Chart</button>
        </div>
        <script nonce="${nonce}" src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <script nonce="${nonce}" src="${scriptUri}"></script>
      </body>
      </html>
    `;
    return html;
  }

  private generateTableRows(parent: TreeNode | null, nodes: TreeNode[], level: number = 0, hidden: boolean = false): string {
    return nodes
      .map((node) => {
        const indent = level * 20;
        const hasChildren = node.children.length > 0;
        // Determine if the current node should be hidden
        const styleDisplay = hidden ? 'style="display:none;"' : '';
        const row = `
                <tr data-level="${level}" data-node-id="${node.id}" data-parent-id="${parent ? parent.id : ''}" class="" ${styleDisplay} collapsed="true" ${hasChildren ? `data-expander="true"` : ''}>
                    <td style="padding-left: ${indent}px; white-space: nowrap;">
                        ${node.getIndentString()}
                        ${hasChildren ? `<span class="expander">${node.expanded ? '▼' : '▶'}</span>` : ''}
                        ${node.getSymbol()}
                    </td>
                    <td align="right">${node.getSize()}</td>
                    <td align="right">${node.getAlign()}</td>
                    <td align="right">${node.getVma()}</td>
                    <td align="right">${node.getLma()}</td>
                </tr>
                ${this.generateTableRows(node, node.children, level + 1, true)}
            `;
        return row;
      })
      .join('');
  }
}

// Utility function to generate nonce
function getNonce() {
  let text = '';
  const possible =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

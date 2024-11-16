// MapFileEditor.ts
import * as vscode from 'vscode';
import { TreeNode } from './TreeNode';

export class MapFileEditor implements vscode.CustomTextEditorProvider {
  public static readonly viewType = 'lldMapView.editor';

  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    const provider = new MapFileEditor(context);
    const providerRegistration = vscode.window.registerCustomEditorProvider(MapFileEditor.viewType, provider);
    return providerRegistration;
  }

  constructor(private readonly context: vscode.ExtensionContext) {}

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
      }
    });
  }

  private updateWebviewContent(document: vscode.TextDocument, webview: vscode.Webview) {
    const data = this.parseMapFile(document.getText());
    webview.html = this.getHtmlForWebview(webview, data);
  }

  private parseMapFile(text: string): TreeNode[] {
    const lines = text.split('\n');
    const rootNodes: TreeNode[] = [];
    const stack: { indent: number; node: TreeNode }[] = [];

    for (const line of lines) {
      if (line.trim() === '') continue; // Skip empty lines

      const indentMatch = line.match(/^(\s*)/);
      const indent = indentMatch ? indentMatch[1].length : 0;
      const content = line.trim();

      // Parse the line into columns
      const columns = content.split(/\s+/);
      const [vma, lma, size, align, ...symbolParts] = columns;
      const symbol = symbolParts.join(' ');

      const node = new TreeNode(symbol, size, align, vma, lma, indent);

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

    return rootNodes;
  }

  private getHtmlForWebview(webview: vscode.Webview, data: TreeNode[]): string {
    const nonce = getNonce();
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'media', 'main.js')
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'media', 'styles.css')
    );

    // Generate the tree table rows
    const tableRows = this.generateTableRows(data);

    return /* html */ `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta http-equiv="Content-Security-Policy"
          content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link href="${styleUri}" rel="stylesheet">
        <title>LLD Map View</title>
      </head>
      <body>
        <button id="switchButton">Switch to Text Editor</button>
        <table>
          <thead>
            <tr>
              <th>Symbol</th>
              <th>Size</th>
              <th>Align</th>
              <th>VMA</th>
              <th>LMA</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
        <script nonce="${nonce}" src="${scriptUri}"></script>
      </body>
      </html>
    `;
  }

  private generateTableRows(nodes: TreeNode[], level: number = 0): string {
    return nodes
      .map((node) => {
        const indent = level * 20;
        const hasChildren = node.children.length > 0;
        const row = `
          <tr data-level="${level}" class="treegrid-${node.id}" ${hasChildren ? `data-expander="true"` : ''}>
            <td style="padding-left: ${indent}px;">
              ${hasChildren ? `<span class="expander">▶</span>` : ''}
              ${node.symbol}
            </td>
            <td>${node.size}</td>
            <td>${node.align}</td>
            <td>${node.vma}</td>
            <td>${node.lma}</td>
          </tr>
          ${this.generateTableRows(node.children, level + 1)}
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

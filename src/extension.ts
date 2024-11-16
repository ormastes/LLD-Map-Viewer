// extension.ts
import * as vscode from 'vscode';
import { MapFileEditor } from './MapFileEditor';

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(MapFileEditor.register(context));

  const openWithText = vscode.commands.registerCommand('lldMapView.openWithText', () => {
    const { activeTextEditor } = vscode.window;
    if (activeTextEditor) {
      vscode.commands.executeCommand('vscode.openWith', activeTextEditor.document.uri, 'default');
    }
  });

  const openWithMapView = vscode.commands.registerCommand('lldMapView.openWithMapView', () => {
    const { activeTextEditor } = vscode.window;
    if (activeTextEditor) {
      vscode.commands.executeCommand(
        'vscode.openWith',
        activeTextEditor.document.uri,
        MapFileEditor.viewType
      );
    }
  });

  context.subscriptions.push(openWithText, openWithMapView);
}

export function deactivate() {}

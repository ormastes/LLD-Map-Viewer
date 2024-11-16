// extension.ts
import * as vscode from 'vscode';
import { MapFileEditor } from './MapFileEditor';

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(MapFileEditor.register(context));

  const openWithMapView = vscode.commands.registerCommand(
    'lldMapViewer.openWithMapView',
    () => {
      const { activeTextEditor } = vscode.window;
      if (activeTextEditor) {
        vscode.commands.executeCommand(
          'vscode.openWith',
          activeTextEditor.document.uri,
          MapFileEditor.viewType
        );
      }
    }
  );

  context.subscriptions.push(openWithMapView);
}

export function deactivate() {}

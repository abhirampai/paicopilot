// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { debounce, triggerCodeGeneration } from "./utils";

const handleCodeGeneration = debounce(() => triggerCodeGeneration(), 800);

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(_context: vscode.ExtensionContext) {
  vscode.workspace.onDidSaveTextDocument(handleCodeGeneration);
}

// This method is called when your extension is deactivated
export function deactivate() {}

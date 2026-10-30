// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { compileReport } from './commands/compileReport';
import { inspectParameters } from './commands/inspectParameter';
import { previewParameterizedReport } from './commands/previewParameterizedReport';
import { previewReport } from './commands/previewReport';
import { DesignerProvider } from './webview/designer/designerProvider';
import { openParameterPanel } from './webview/parameterPanel';
// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "jasperreports-vscode" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	const disposable = vscode.commands.registerCommand('jasperreports-vscode.helloWorld', () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		vscode.window.showInformationMessage('Hello World from jasperreports-vscode!');
	});

	const compileReportCommand = vscode.commands.registerCommand('jasperreports-vscode.compileReport',compileReport);

	const previewReportCommand = vscode.commands.registerCommand('jasperreports-vscode.previewReport',previewReport);

	const inspectParametersCommand = vscode.commands.registerCommand('jasperreports-vscode.inspectParameters',inspectParameters);

	const previewParameterizedReportCommand = vscode.commands.registerCommand('jasperreports-vscode.previewParameterizedReport',previewParameterizedReport);

	const openParameterPanelCommand = vscode.commands.registerCommand('jasperreports-vscode.openParameterPanel',() => openParameterPanel(context));

	const designerProvider = DesignerProvider.register(context);

	context.subscriptions.push(
    disposable,
    compileReportCommand,
    previewReportCommand,
    inspectParametersCommand,
    previewParameterizedReportCommand,
    openParameterPanelCommand,
    designerProvider
);
}

// This method is called when your extension is deactivated
export function deactivate() {}

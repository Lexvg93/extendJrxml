import * as vscode from 'vscode';

export async function previewReport(): Promise<void> {
    const archivos = await vscode.window.showOpenDialog({
        canSelectMany: false,
        openLabel: 'Seleccionar informe para previsualizar',
        filters: {
            'Informes JasperReports': ['jrxml']
        }
    });

    if (!archivos || archivos.length === 0) {
        vscode.window.showInformationMessage(
            'Selección de informe cancelada.'
        );
        return;
    }

    const archivoSeleccionado = archivos[0];

    vscode.window.showInformationMessage(
        `Informe para previsualizar: ${archivoSeleccionado.fsPath}`
    );
}
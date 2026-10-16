import * as vscode from 'vscode';

export async function compileReport(): Promise<void>{
    const archivos = await vscode.window.showOpenDialog({
        canSelectMany: false,
        openLabel: 'Seleccionar informe',
        filters:{
            'Informes JasperReports':['jrxml']
        }
    });

    if(!archivos || archivos.length === 0){
        vscode.window.showInformationMessage('Seleccion de informe cancelada');
        return;
    }

    const archivoSeleccionado = archivos[0];



    vscode.window.showInformationMessage(`Informe seleccionado: ${archivoSeleccionado.fsPath}`);
}
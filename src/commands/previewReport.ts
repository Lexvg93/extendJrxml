import * as vscode from 'vscode';
import * as path from 'node:path';
import { spawn } from 'node:child_process';

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

    const rutaJrxml = archivos[0].fsPath;
    const extensionRoot = path.resolve(__dirname, '..', '..');
    const runtimeDir = path.join(
        extensionRoot,
        'resources',
        'java-runtime'
    );

    const jarMotor = path.join(
        runtimeDir,
        'jasperreports-vscode-engine-1.0.0.jar'
    );

    const libreriasDir = path.join(runtimeDir, 'lib');
    
    const classpath = [
        jarMotor, path.join(libreriasDir, '*')
    ].join(path.delimiter);

    const ejecutableJava = process.platform === 'win32' ? 'java.exe' : 'java';
    const nombrePdf = path.basename(rutaJrxml, path.extname(rutaJrxml))+'.pdf';

    const rutaPdf = path.join(path.dirname(rutaJrxml),nombrePdf);
    const proceso = spawn(ejecutableJava, [
        '-cp',
        classpath,
        'com.jasper.JasperPreview',
        rutaJrxml,
        rutaPdf
    ],{ cwd: extensionRoot, windowsHide: true});

    let salida = '';
    let errores = '';

    proceso.stdout.setEncoding('utf8');
    proceso.stderr.setEncoding('utf8');

    proceso.stdout.on('data', (datos: string) => {
        salida += datos;
    });

    proceso.stderr.on('data', (datos: string) => {
        errores += datos;
    });

    proceso.on('error', (error: Error) => {
        vscode.window.showErrorMessage(
            `No se pudo ejecutar Java: ${error.message}`
        );
    });

    proceso.on('close', async (codigo: number | null) => {
        if (codigo !== 0) {
            const detalle = errores.trim() || salida.trim();

            console.error(
                '[JasperReports] Error al generar el PDF:',
                detalle
            );

            vscode.window.showErrorMessage(
                `Error al generar el PDF. Código: ${codigo}. ` +
                (detalle || 'Consulta la consola de desarrollo.')
            );

            return;
        }

        console.log('[JasperReports]', salida);

        const documentoPdf = vscode.Uri.file(rutaPdf);

        try {
            await vscode.env.openExternal(documentoPdf);

            vscode.window.showInformationMessage(
                `PDF generado correctamente: ${nombrePdf}`
            );
        } catch (error) {
            vscode.window.showErrorMessage(
                `El PDF se generó, pero no se pudo abrir: ${String(error)}`
            );
        }
    });

    /*vscode.window.showInformationMessage(
        `Informe para previsualizar: ${archivoSeleccionado.fsPath}`
    );*/
}
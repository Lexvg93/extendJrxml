import * as vscode from 'vscode';
import * as path from 'node:path';
import { spawn } from 'node:child_process';

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
    const rutaJrxml = archivoSeleccionado.fsPath;

    const extensionRoot = path.resolve(__dirname, '..', '..');
    const runttimeDir = path.join(
        extensionRoot,
        'resources',
        'java-runtime'
    );

    const jarMotor = path.join(
        runttimeDir,
        'jasperreports-vscode-engine-1.0.0.jar'
    );

    const libreriasDir = path.join(runttimeDir, 'lib');

    const separadorClasspath = path.delimiter;

    const classpath = [
        jarMotor,
        path.join(libreriasDir, '*')
    ].join(separadorClasspath);

    const terminalJava = process.platform === 'win32' ? 'java.exe' : 'java';
    const opcionesJava = ['-cp', classpath, 'com.jasper.JasperCompiler',rutaJrxml];

    vscode.window.showInformationMessage(`Compilando informe: ${path.basename(rutaJrxml)}`);

    const proceso = spawn(terminalJava, opcionesJava,{
        cwd:extensionRoot,
        windowsHide: true
    });

    let salida = '';
    let errores = '';

    proceso.stdout.setEncoding('utf8');
    proceso.stderr.setEncoding('utf8');

    proceso.stdout.on('data', (datos:string) => {
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

    proceso.on('close', (codigo: number | null) => {
        if(codigo === 0){
            vscode.window.showInformationMessage(
                `Informe compilado correctamente: ${path.basename(rutaJrxml)}`
            );

            if(salida.trim()){
                console.log('[JasperReports]', salida);
            }

            return;
        }

        const detalle = errores.trim() || salida.trim();

        console.error('[JasperReports] Error de compilación:', detalle);

        vscode.window.showErrorMessage(
            `Error al compilar el informe. Código: ${codigo}. ` +
            (detalle || 'Consulta la consola de desarrollo.')
        );
    })
    //vscode.window.showInformationMessage(`Informe seleccionado: ${archivoSeleccionado.fsPath}`);
}
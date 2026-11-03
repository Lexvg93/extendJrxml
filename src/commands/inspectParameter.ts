
import { spawn } from 'node:child_process';
import * as path from 'node:path';
import * as vscode from 'vscode';

interface JasperParameter {
    name: string;
    type: string;
}

interface JasperParameterResult {
    success: boolean;
    parameters: JasperParameter[];
    total: number;
}

export async function inspectParameters(): Promise<void> {
    const archivos = await vscode.window.showOpenDialog({
        canSelectMany: false,
        openLabel: 'Inspeccionar parámetros',
        filters: {
            'Informes JasperReports': ['jrxml']
        }
    });

    if (!archivos || archivos.length === 0) {
        vscode.window.showInformationMessage(
            'Selección de informe cancelada'
        );
        return;
    }

    const archivoSeleccionado = archivos[0];
    const rutaJrxml = archivoSeleccionado.fsPath;

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
        jarMotor,
        path.join(libreriasDir, '*')
    ].join(path.delimiter);

    const javaExecutable = process.platform === 'win32' ? 'java.exe' : 'java';

    /*const terminalJava = process.env.JAVA_HOME
    ? require('path').join(process.env.JAVA_HOME, 'bin', javaExecutable)
    : javaExecutable;*/
    
    
    const terminalJava = 'C:\\Users\\avalderr\\AppData\\Local\\Programs\\Eclipse Adoptium\\jdk-17.0.20.8-hotspot\\bin\\java.exe';
    //const terminalJava = '/Volumes/Alejandro/descargas/jdk-17.0.21+9/Contents/Home/bin/java'; 

    const opcionesJava = [
        '-cp',
        classpath,
        'com.jasper.JasperParameterInspector',
        rutaJrxml
    ];

    vscode.window.showInformationMessage(
        `Inspeccionando parámetros: ${path.basename(rutaJrxml)}`
    );

    const proceso = spawn(terminalJava, opcionesJava, {
        cwd: extensionRoot,
        windowsHide: true
    });

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

    proceso.on('close', (codigo: number | null) => {
        if (codigo !== 0) {
            const detalle = errores.trim() || salida.trim();

            console.error(
                '[JasperReports] Error al inspeccionar parámetros:',
                detalle
            );

            vscode.window.showErrorMessage(
                `Error al inspeccionar los parámetros. Código: ${codigo}. ` +
                (detalle || 'Consulta la consola de desarrollo.')
            );

            return;
        }

        try {
            const resultado = JSON.parse(
                salida
            ) as JasperParameterResult;

            if (
                resultado.success !== true ||
                !Array.isArray(resultado.parameters)
            ) {
                throw new Error(
                    'La respuesta del inspector no tiene el formato esperado.'
                );
            }

            if (resultado.parameters.length === 0) {
                vscode.window.showInformationMessage(
                    'El informe no contiene parámetros de usuario.'
                );
                return;
            }

            const detalle = resultado.parameters
                .map(
                    (parametro) =>
                        `${parametro.name} — ${parametro.type}`
                )
                .join('\n');

            const documento = vscode.workspace.openTextDocument({
                language: 'plaintext',
                content:
                    `Parámetros de ${path.basename(rutaJrxml)}\n` +
                    `Total: ${resultado.parameters.length}\n\n` +
                    detalle
            });

            void documento.then((doc) => vscode.window.showTextDocument(doc));
        } catch (error) {
            const mensaje = error instanceof Error
                ? error.message
                : String(error);

            console.error(
                '[JasperReports] Respuesta inválida del inspector:',
                salida,
                error
            );

            vscode.window.showErrorMessage(
                `No se pudo interpretar la respuesta del inspector: ${mensaje}`
            );
        }
    });
}

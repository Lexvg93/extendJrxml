
import { spawn } from 'node:child_process';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import * as vscode from 'vscode';

import { inspectParametersForReport } from './parameterUtils';

export async function previewParameterizedReport(): Promise<void> {
    const archivos = await vscode.window.showOpenDialog({
        canSelectMany: false,
        openLabel: 'Previsualizar con parámetros',
        filters: {
            'Informes JasperReports': ['jrxml']
        }
    });

    if (!archivos || archivos.length === 0) {
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

    const classpath = [
        jarMotor,
        path.join(runtimeDir, 'lib', '*')
    ].join(path.delimiter);

    //const terminalJava =
    //    'C:\\Users\\avalderr\\AppData\\Local\\Programs\\Eclipse Adoptium\\jdk-17.0.20.8-hotspot\\bin\\java.exe';
    const terminalJava = '/Volumes/Alejandro/descargas/jdk-17.0.21+9/Contents/Home/bin/java';

    let rutaJson: string | undefined;

    try {
        const parametros = await inspectParametersForReport(rutaJrxml);

        if (parametros.length === 0) {
            vscode.window.showInformationMessage(
                'El informe no contiene parámetros de usuario.'
            );
            return;
        }

        const valores: Record<string, string | number | boolean | null> = {};

        for (const parametro of parametros) {
            const respuesta = await vscode.window.showInputBox({
                title: `Parámetro ${parametro.name}`,
                prompt: `Tipo Java: ${parametro.type}`,
                placeHolder: `Introduce el valor para ${parametro.name}`,
                ignoreFocusOut: true
            });

            if (respuesta === undefined) {
                vscode.window.showInformationMessage(
                    'Previsualización cancelada.'
                );
                return;
            }

            const convertido = convertirParametro(
                respuesta,
                parametro.type,
                parametro.name
            );

            valores[parametro.name] = convertido;
        }

        rutaJson = path.join(
            os.tmpdir(),
            `stark-jasper-${Date.now()}.json`
        );

        await fs.writeFile(
            rutaJson,
            JSON.stringify(valores, null, 2),
            'utf8'
        );

        const rutaPdf = path.join(
            path.dirname(rutaJrxml),
            `${path.basename(rutaJrxml, '.jrxml')}-parametrizado.pdf`
        );

        const codigo = await ejecutarJava(
            terminalJava,
            [
                '-cp',
                classpath,
                'com.jasper.JasperParameterizedPreview',
                rutaJrxml,
                rutaJson,
                rutaPdf
            ],
            extensionRoot
        );

        if (codigo !== 0) {
            throw new Error(
                `El motor Java terminó con el código ${codigo}.`
            );
        }

        await vscode.env.openExternal(vscode.Uri.file(rutaPdf));

        vscode.window.showInformationMessage(
            `PDF generado: ${path.basename(rutaPdf)}`
        );
    } catch (error) {
        const mensaje = error instanceof Error
            ? error.message
            : String(error);

        vscode.window.showErrorMessage(
            `No se pudo previsualizar el informe: ${mensaje}`
        );
    } finally {
        if (rutaJson) {
            await fs.rm(rutaJson, { force: true }).catch(() => undefined);
        }
    }
}

function convertirParametro(
    valor: string,
    tipo: string,
    nombre: string
): string | number | boolean | null {
    if (valor.trim() === '') {
        return null;
    }

    switch (tipo) {
        case 'java.lang.String':
            return valor;

        case 'java.lang.Integer':
        case 'java.lang.Short':
        case 'java.lang.Byte': {
            const numero = Number(valor);

            if (!Number.isInteger(numero)) {
                throw new Error(
                    `El parámetro ${nombre} debe ser un número entero.`
                );
            }

            return numero;
        }

        case 'java.lang.Long':
        case 'java.lang.Double':
        case 'java.lang.Float': {
            const numero = Number(valor);

            if (!Number.isFinite(numero)) {
                throw new Error(
                    `El parámetro ${nombre} debe ser un número válido.`
                );
            }

            return numero;
        }

        case 'java.lang.Boolean': {
            const texto = valor.trim().toLowerCase();

            if (texto !== 'true' && texto !== 'false') {
                throw new Error(
                    `El parámetro ${nombre} debe ser true o false.`
                );
            }

            return texto === 'true';
        }

        default:
            throw new Error(
                `El tipo ${tipo} del parámetro ${nombre} aún no está soportado.`
            );
    }
}

function ejecutarJava(
    ejecutable: string,
    argumentos: string[],
    cwd: string
): Promise<number> {
    return new Promise((resolve, reject) => {
        const proceso = spawn(ejecutable, argumentos, {
            cwd,
            windowsHide: true
        });

        let errores = '';

        proceso.stderr.setEncoding('utf8');

        proceso.stderr.on('data', (datos: string) => {
            errores += datos;
        });

        proceso.on('error', reject);

        proceso.on('close', (codigo) => {
            if (codigo !== 0) {
                reject(
                    new Error(
                        errores.trim() ||
                        `La ejecución Java terminó con código ${codigo}.`
                    )
                );
                return;
            }

            resolve(codigo ?? 0);
        });
    });
}

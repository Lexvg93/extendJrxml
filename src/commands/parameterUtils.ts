
import { spawn } from 'node:child_process';
import * as path from 'node:path';

export interface JasperParameter {
    name: string;
    type: string;
    hasDefaultValue: boolean;
}

interface JasperParameterResult {
    success: boolean;
    parameters: JasperParameter[];
    total: number;
}

export function inspectParametersForReport(
    rutaJrxml: string
): Promise<JasperParameter[]> {
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

    const terminalJava =
        'C:\\Users\\avalderr\\AppData\\Local\\Programs\\Eclipse Adoptium\\jdk-17.0.20.8-hotspot\\bin\\java.exe';

    const opcionesJava = [
        '-cp',
        classpath,
        'com.jasper.JasperParameterInspector',
        rutaJrxml
    ];

    return new Promise((resolve, reject) => {
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

        proceso.on('error', reject);

        proceso.on('close', (codigo) => {
            if (codigo !== 0) {
                reject(
                    new Error(
                        errores.trim() ||
                        salida.trim() ||
                        `El inspector terminó con código ${codigo}.`
                    )
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

                resolve(resultado.parameters);
            } catch (error) {
                reject(error);
            }
        });
    });
}

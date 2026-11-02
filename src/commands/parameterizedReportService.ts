
import { spawn } from 'node:child_process';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';

export type ParameterValue = string | number | boolean | null;

export async function generateParameterizedPdf(
    rutaJrxml: string,
    valores: Record<string, ParameterValue>
): Promise<string> {
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

    const terminalJava =
        //'C:\\Users\\avalderr\\AppData\\Local\\Programs\\Eclipse Adoptium\\jdk-17.0.20.8-hotspot\\bin\\java.exe';
        '/Volumes/Alejandro/descargas/jdk-17.0.21+9/Contents/Home/bin/java';

    let rutaJson: string | undefined;

    try {
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

        await ejecutarJava(
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

        return rutaPdf;
    } finally {
        if (rutaJson) {
            await fs.rm(rutaJson, { force: true }).catch(() => undefined);
        }
    }
}

function ejecutarJava(
    ejecutable: string,
    argumentos: string[],
    cwd: string
): Promise<void> {
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
                        `La ejecución Java terminó con código ${codigo ?? 'desconocido'}.`
                    )
                );
                return;
            }

            resolve();
        });
    });
}

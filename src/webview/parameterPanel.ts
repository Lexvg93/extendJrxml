
import { randomBytes } from 'node:crypto';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as vscode from 'vscode';

import {
    inspectParametersForReport,
    type JasperParameter
} from '../commands/parameterUtils';

import {
    generateParameterizedPdf,
    type ParameterValue
} from '../commands/parameterizedReportService';

export async function openParameterPanel(
    context: vscode.ExtensionContext
): Promise<void> {
    const archivos = await vscode.window.showOpenDialog({
        canSelectMany: false,
        openLabel: 'Abrir informe',
        filters: {
            'Informes JasperReports': ['jrxml']
        }
    });

    if (!archivos || archivos.length === 0) {
        return;
    }

    const rutaJrxml = archivos[0].fsPath;

    const panel = vscode.window.createWebviewPanel(
        'starkJasperParameters',
        'STARK JasperReports — Parámetros',
        vscode.ViewColumn.One,
        {
            enableScripts: true,
            localResourceRoots: [
                vscode.Uri.joinPath(
                    context.extensionUri,
                    'media',
                    'parameterPanel'
                )
            ]
        }
    );

    const htmlPath = vscode.Uri.joinPath(
        context.extensionUri,
        'media',
        'parameterPanel',
        'index.html'
    );

    const cssPath = vscode.Uri.joinPath(
        context.extensionUri,
        'media',
        'parameterPanel',
        'styles.css'
    );

    const jsPath = vscode.Uri.joinPath(
        context.extensionUri,
        'media',
        'parameterPanel',
        'main.js'
    );

    let inspeccionIniciada = false;
    let parametrosInforme: JasperParameter[] = [];

    panel.webview.onDidReceiveMessage(async (mensaje) => {
        if (mensaje.command === 'ready') {
            if (inspeccionIniciada) {
                return;
            }

            inspeccionIniciada = true;

            try {
                const parametros =
                    await inspectParametersForReport(rutaJrxml);

                parametrosInforme = parametros;

                await panel.webview.postMessage({
                    command: 'showParameters',
                    parameters: parametros
                });

                if (parametros.length === 0) {
                    await panel.webview.postMessage({
                        command: 'showError',
                        message:
                            'El informe no contiene parámetros de usuario.'
                    });
                }
            } catch (error) {
                const detalle = error instanceof Error
                    ? error.message
                    : String(error);

                await panel.webview.postMessage({
                    command: 'showError',
                    message:
                        `No se pudieron inspeccionar los parámetros: ${detalle}`
                });
            }

            return;
        }

        if (mensaje.command === 'cancel') {
            panel.dispose();
            return;
        }

        if (mensaje.command === 'generatePdf') {
            try {
                if (
                    mensaje.values === null ||
                    typeof mensaje.values !== 'object' ||
                    Array.isArray(mensaje.values)
                ) {
                    throw new Error(
                        'Los valores recibidos no son válidos.'
                    );
                }

                const valores: Record<string, ParameterValue> = {};

                for (
                    const [nombre, valor]
                    of Object.entries(mensaje.values)
                ) {
                    if (typeof valor !== 'string') {
                        throw new Error(
                            `El valor del parámetro ${nombre} no es válido.`
                        );
                    }

                    const parametro = parametrosInforme.find(
                        (elemento) => elemento.name === nombre
                    );

                    if (!parametro) {
                        throw new Error(
                            `Parámetro desconocido: ${nombre}`
                        );
                    }

                    // Si está vacío y tiene valor predeterminado,
                    // no lo enviamos para que JasperReports lo aplique.
                    if (
                        valor.trim() === '' &&
                        parametro.hasDefaultValue
                    ) {
                        continue;
                    }

                    valores[nombre] = convertirValorPanel(
                        valor,
                        parametro.type,
                        nombre
                    );
                }

                const rutaPdf = await generateParameterizedPdf(
                    rutaJrxml,
                    valores
                );

                await vscode.env.openExternal(
                    vscode.Uri.file(rutaPdf)
                );

                await panel.webview.postMessage({
                    command: 'showSuccess',
                    message: `PDF generado: ${path.basename(rutaPdf)}`
                });

                vscode.window.showInformationMessage(
                    `PDF generado: ${path.basename(rutaPdf)}`
                );
            } catch (error) {
                const detalle = error instanceof Error
                    ? error.message
                    : String(error);

                await panel.webview.postMessage({
                    command: 'showError',
                    message:
                        `No se pudo generar el PDF: ${detalle}`
                });
            }
        }
    });

    try {
        const html = await fs.readFile(htmlPath.fsPath, 'utf8');
        const cssUri = panel.webview.asWebviewUri(cssPath);
        const jsUri = panel.webview.asWebviewUri(jsPath);
        const nonce = randomBytes(16).toString('base64');

        panel.webview.html = prepararHtml(
            html,
            cssUri.toString(),
            jsUri.toString(),
            nonce,
            panel.webview.cspSource
        );
    } catch (error) {
        const mensaje = error instanceof Error
            ? error.message
            : String(error);

        panel.webview.html = `
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <title>Error al abrir el panel</title>
            </head>
            <body>
                <h1>No se pudo cargar el panel</h1>
                <p>${escaparHtml(mensaje)}</p>
            </body>
            </html>
        `;
    }
}

function prepararHtml(
    html: string,
    cssUri: string,
    jsUri: string,
    nonce: string,
    cspSource: string
): string {
    const politica = `
        <meta
            http-equiv="Content-Security-Policy"
            content="default-src 'none';
                     style-src ${cspSource};
                     script-src 'nonce-${nonce}';
                     base-uri 'none';
                     form-action 'none';"
        >
    `;

    let resultado = html;

    resultado = resultado.replace(
        /<link rel="stylesheet" href="styles\.css">/i,
        ''
    );

    resultado = resultado.replace(
        /<script src="main\.js"><\/script>/i,
        ''
    );

    const recursos = `
        <link rel="stylesheet" href="${cssUri}">
        <script nonce="${nonce}" src="${jsUri}"></script>
    `;

    if (resultado.includes('</head>')) {
        resultado = resultado.replace(
            '</head>',
            `${politica}\n</head>`
        );
    }

    if (resultado.includes('</body>')) {
        resultado = resultado.replace(
            '</body>',
            `${recursos}\n</body>`
        );
    }

    return resultado;
}

function escaparHtml(texto: string): string {
    return texto
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function convertirValorPanel(
    valor: string,
    tipo: string,
    nombre: string
): ParameterValue {
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

            if (!Number.isSafeInteger(numero)) {
                throw new Error(
                    `El parámetro ${nombre} debe ser un número entero válido.`
                );
            }

            if (
                tipo === 'java.lang.Byte' &&
                (numero < -128 || numero > 127)
            ) {
                throw new Error(
                    `El parámetro ${nombre} debe estar entre -128 y 127.`
                );
            }

            if (
                tipo === 'java.lang.Short' &&
                (numero < -32768 || numero > 32767)
            ) {
                throw new Error(
                    `El parámetro ${nombre} está fuera del rango Short.`
                );
            }

            if (
                tipo === 'java.lang.Integer' &&
                (numero < -2147483648 || numero > 2147483647)
            ) {
                throw new Error(
                    `El parámetro ${nombre} está fuera del rango Integer.`
                );
            }

            return numero;
        }

        case 'java.lang.Long': {
            const numero = Number(valor);

            if (!Number.isSafeInteger(numero)) {
                throw new Error(
                    `El parámetro ${nombre} debe ser un entero dentro del rango seguro de JavaScript.`
                );
            }

            return numero;
        }

        case 'java.lang.Double': {
            const numero = Number(valor);

            if (!Number.isFinite(numero)) {
                throw new Error(
                    `El parámetro ${nombre} debe ser un número válido.`
                );
            }

            return numero;
        }

        case 'java.lang.Float': {
            const numero = Number(valor);

            if (
                !Number.isFinite(numero) ||
                Math.abs(numero) > 3.4028235e38
            ) {
                throw new Error(
                    `El parámetro ${nombre} está fuera del rango permitido para Float.`
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



import * as vscode from "vscode";

export class DesignerProvider
    implements vscode.CustomTextEditorProvider {

    public static readonly viewType = "stark.jasperDesigner";

    public static register(
        context: vscode.ExtensionContext
    ): vscode.Disposable {

        const provider = new DesignerProvider(context);

        return vscode.window.registerCustomEditorProvider(
            DesignerProvider.viewType,
            provider
        );
    }

    private constructor(
        private readonly context: vscode.ExtensionContext
    ) {}

    public async resolveCustomTextEditor(
        document: vscode.TextDocument,
        webviewPanel: vscode.WebviewPanel,
        token: vscode.CancellationToken
    ): Promise<void> {

        const webview = webviewPanel.webview;

        webview.options = {
            enableScripts: true,
            localResourceRoots: [
                vscode.Uri.joinPath(
                    this.context.extensionUri,
                    "media",
                    "designer"
                )
            ]
        };

        const designerFolder = vscode.Uri.joinPath(
            this.context.extensionUri,
            "media",
            "designer"
        );

        const htmlUri = webview.asWebviewUri(
            vscode.Uri.joinPath(designerFolder, "index.html")
        );

        const cssUri = webview.asWebviewUri(
            vscode.Uri.joinPath(designerFolder, "styles.css")
        );

        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(designerFolder, "main.js")
        );

        const parserUri = webview.asWebviewUri(
            vscode.Uri.joinPath(designerFolder, "jrxmlParser.js")
        );

        const rendererUri = webview.asWebviewUri(
            vscode.Uri.joinPath(designerFolder, "designerRenderer.js")
        );

        const nonce = this.getNonce();

        webview.html = this.getHtml(
            webview,
            htmlUri,
            cssUri,
            parserUri,
            rendererUri,
            scriptUri,
            nonce,
            document.fileName
        );

        const messageListener = webview.onDidReceiveMessage(
            async message => {

                switch (message.command) {

                    case "ready":

                        webview.postMessage({
                            command: "documentLoaded",
                            fileName: document.fileName,
                            text: document.getText()
                        });

                        break;

                    
                    case "save": {

                        type DesignerElement = {
                            type: string;
                            uuid: string | null;
                            x: number;
                            y: number;
                            width: number;
                            height: number;
                            text?: string;
                        };

                        type DesignerBand = {
                            height: number;
                            elements: DesignerElement[];
                        };

                        type DesignerReport = {
                            bands: Record<string, DesignerBand[]>;
                        };

                        const report = message.report as DesignerReport | undefined;

                        if (!report || !report.bands) {

                            webview.postMessage({
                                command: "saveCompleted",
                                message: "No se recibió un informe válido."
                            });

                            return;
                        }

                        try {

                            // 1. Obtener el XML actual del documento.
                            const originalXml = document.getText();

                            let updatedXml = originalXml;

                            // 2. Recorrer las bandas y sus elementos.
                            for (const [bandName, bandList] of Object.entries(report.bands)) {

                                for (const [bandIndex, band] of bandList.entries()) {

                                    for (const element of band.elements) {

                                        if (!element.uuid) {
                                            throw new Error(
                                                `El elemento ${element.type} de ${bandName} no tiene UUID.`
                                            );
                                        }

                                        const properties = {
                                            x: element.x,
                                            y: element.y,
                                            width: element.width,
                                            height: element.height
                                        };

                                        // 3. Validar las propiedades geométricas.
                                        for (const [property, value] of Object.entries(properties)) {

                                            if (!Number.isInteger(value) || value < 0) {
                                                throw new Error(
                                                    `Valor inválido en ${property} para UUID ${element.uuid}.`
                                                );
                                            }
                                        }

                                        // 4. Comprobar si el elemento ya existe en el XML.
                                        if (updatedXml.includes(element.uuid)) {

                                            // Elemento existente: actualizar su geometría.
                                            updatedXml = this.updateReportElement(
                                                updatedXml,
                                                element.uuid,
                                                properties
                                            );

                                        } else if (element.type === "staticText") {

                                            // Elemento nuevo: insertarlo dentro de su banda.
                                            updatedXml = this.insertStaticTextElement(
                                                updatedXml,
                                                bandName,
                                                bandIndex,
                                                {
                                                    uuid: element.uuid,
                                                    x: element.x,
                                                    y: element.y,
                                                    width: element.width,
                                                    height: element.height,
                                                    text: element.text
                                                }
                                            );

                                        } else {

                                            // Todavía no soportamos la inserción de otros tipos.
                                            throw new Error(
                                                `Todavía no se puede guardar un elemento nuevo de tipo ${element.type}.`
                                            );
                                        }

                                        console.log(
                                            "STARK Kraken: elemento preparado para guardar",
                                            {
                                                bandName,
                                                bandIndex,
                                                uuid: element.uuid,
                                                ...properties
                                            }
                                        );
                                    }
                                }
                            }

                            // 5. Aplicar los cambios al documento mediante WorkspaceEdit.
                            const edit = new vscode.WorkspaceEdit();

                            edit.replace(
                                document.uri,
                                new vscode.Range(
                                    document.positionAt(0),
                                    document.positionAt(originalXml.length)
                                ),
                                updatedXml
                            );

                            const applied = await vscode.workspace.applyEdit(edit);

                            if (!applied) {
                                throw new Error(
                                    "VS Code no pudo aplicar los cambios al documento."
                                );
                            }

                            // 6. Guardar el archivo JRXML.
                            const saved = await document.save();

                            if (!saved) {
                                throw new Error(
                                    "No se pudo guardar el archivo JRXML."
                                );
                            }

                            webview.postMessage({
                                command: "saveCompleted",
                                message: "¡Informe JRXML guardado correctamente!"
                            });

                            console.log(
                                "STARK Kraken: informe guardado correctamente",
                                document.fileName
                            );

                        } catch (error) {

                            const errorMessage = error instanceof Error
                                ? error.message
                                : String(error);

                            console.error(
                                "STARK Kraken: error al guardar el informe",
                                error
                            );

                            webview.postMessage({
                                command: "saveCompleted",
                                message: `Error al guardar: ${errorMessage}`
                            });
                        }

                        break;
                    }

                }
            }
        );

        token.onCancellationRequested(() => {
            messageListener.dispose();
        });

        webviewPanel.onDidDispose(() => {
            messageListener.dispose();
        });
    }

    private getHtml(
        webview: vscode.Webview,
        htmlUri: vscode.Uri,
        cssUri: vscode.Uri,
        parserUri: vscode.Uri,
        rendererUri: vscode.Uri,
        scriptUri: vscode.Uri,
        nonce: string,
        fileName: string
    ): string {

        return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">

    <meta
        http-equiv="Content-Security-Policy"
        content="default-src 'none';
        style-src ${webview.cspSource};
        script-src 'nonce-${nonce}';
        img-src ${webview.cspSource} data:;"
    >

    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <title>STARK JasperReports Designer</title>

    <link rel="stylesheet" href="${cssUri}">
</head>

<body>

    <div id="designer-container">

        <header id="designer-toolbar">

            <div class="toolbar-brand">
                STARK JasperReports
            </div>

            <div class="toolbar-document">
                ${this.escapeHtml(fileName)}
            </div>

            <div class="toolbar-actions">
                <button id="save-button">Guardar</button>
            </div>

        </header>

        <main id="designer-workspace">

            <aside id="elements-panel">
                <h2>Elementos</h2>

                <div id="elements-list">
                        <div class="element-item"
                            data-element-type="staticText"
                            draggable="true">
                            Texto estático
                        </div>

                        <div class="element-item"
                            data-element-type="textField"
                            draggable="true">
                            Campo de texto
                        </div>

                        <div class="element-item"
                            data-element-type="field"
                            draggable="true">
                            Campo de datos
                        </div>

                        <div class="element-item"
                            data-element-type="image"
                            draggable="true">
                            Imagen
                        </div>

                        <div class="element-item"
                            data-element-type="line"
                            draggable="true">
                            Línea
                        </div>

                        <div class="element-item"
                            data-element-type="rectangle"
                            draggable="true">
                            Rectángulo
                        </div>
                    </div>
            </aside>

            <section id="canvas-panel">

                <div id="canvas-toolbar">
                    <span>Diseñador de informes</span>
                    <span id="zoom-level">100%</span>
                </div>

                <div id="canvas-container">

                    <div id="report-page">
                        <div id="report-bands">
                            
                        </div>
                    </div>

                </div>

            </section>

            <aside id="properties-panel">
                <h2>Propiedades</h2>

                <div id="properties-content">
                    <p>Selecciona un elemento para editar sus propiedades.</p>
                </div>
            </aside>

        </main>

    </div>

    <script nonce="${nonce}" src="${parserUri}"></script>
    <script nonce="${nonce}" src="${rendererUri}"></script>
    <script nonce="${nonce}" src="${scriptUri}"></script>

</body>
</html>`;
    }

        private insertStaticTextElement(
        xml: string,
        bandName: string,
        bandIndex: number,
        element: {
            uuid: string;
            x: number;
            y: number;
            width: number;
            height: number;
            text?: string;
        }
    ): string {

        // 1. Localizar la sección del informe.
        const escapedBandName = bandName.replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&"
        );

        const sectionRegex = new RegExp(
            `<${escapedBandName}\\b[^>]*>([\\s\\S]*?)<\\/${escapedBandName}>`
        );

        const sectionMatch = xml.match(sectionRegex);

        if (!sectionMatch) {
            throw new Error(
                `No se encontró la sección ${bandName} en el JRXML.`
            );
        }

        const sectionContent = sectionMatch[1];

        // 2. Localizar las bandas de esa sección.
        const bandRegex = /<band\b[^>]*>[\s\S]*?<\/band>/g;

        const bandMatches = Array.from(
            sectionContent.matchAll(bandRegex)
        );

        const selectedBand = bandMatches[bandIndex];

        if (!selectedBand || selectedBand.index === undefined) {
            throw new Error(
                `No se encontró la banda ${bandIndex} de ${bandName}.`
            );
        }

        const bandXml = selectedBand[0];

        // 3. Determinar la indentación del XML.
        const indentationMatch = bandXml.match(
            /(?:^|\r?\n)([ \t]*)<band\b/
        );

        const bandIndent = indentationMatch?.[1] ?? "\t";
        const elementIndent = bandIndent + "\t";
        const childIndent = elementIndent + "\t";

        // 4. Escapar el texto para que sea XML válido.
        const escapedText = (element.text ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");

        // 5. Construir el nodo staticText.
        const newElementXml = [
            `${elementIndent}<staticText>`,
            `${childIndent}<reportElement x="${element.x}" y="${element.y}" width="${element.width}" height="${element.height}" uuid="${element.uuid}"/>`,
            `${childIndent}<text>${escapedText}</text>`,
            `${elementIndent}</staticText>`
        ].join("\n");

        // 6. Insertar el nodo antes del cierre de la banda.
        const closingTagIndex = bandXml.lastIndexOf("</band>");

        const contentBeforeClosing = bandXml.slice(
            0,
            closingTagIndex
        );

        const trailingWhitespaceMatch = contentBeforeClosing.match(
            /(\r?\n[ \t]*)$/
        );

        const trailingWhitespace =
            trailingWhitespaceMatch?.[1] ?? `\n${bandIndent}`;

        const existingContent = trailingWhitespaceMatch
            ? contentBeforeClosing.slice(
                0,
                -trailingWhitespace.length
            )
            : contentBeforeClosing;

        const updatedBandXml =
            existingContent +
            "\n" +
            newElementXml +
            trailingWhitespace +
            "</band>";

        // 7. Reconstruir la sección conservando las demás bandas.
        const bandPosition = selectedBand.index;

        const updatedSectionContent =
            sectionContent.slice(0, bandPosition) +
            updatedBandXml +
            sectionContent.slice(
                bandPosition + bandXml.length
            );

        const updatedSectionXml = sectionMatch[0].replace(
            sectionContent,
            updatedSectionContent
        );

        return xml.replace(
            sectionMatch[0],
            updatedSectionXml
        );
    }
    private updateReportElement(
        xml: string,
        uuid: string,
        properties: {
            x: number;
            y: number;
            width: number;
            height: number;
        }
    ): string {

        const escapedUuid = uuid.replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&"
        );

        const regex = new RegExp(
            `<reportElement\\b(?=[^>]*\\buuid=["']${escapedUuid}["'])[^>]*\\/?>`
        );

        const matches = xml.match(regex);

        if (!matches || matches.length !== 1) {
            throw new Error(
                `No se pudo localizar de forma única el elemento UUID: ${uuid}`
            );
        }

        const updatedTag = matches[0];

        const updatedAttributes = {
            x: properties.x,
            y: properties.y,
            width: properties.width,
            height: properties.height
        };

        let result = updatedTag;

        for (const [attribute, value] of Object.entries(updatedAttributes)) {

            const attributeRegex = new RegExp(
                `\\b${attribute}=["'][^"']*["']`
            );

            if (attributeRegex.test(result)) {

                result = result.replace(
                    attributeRegex,
                    `${attribute}="${value}"`
                );

            } else {

                result = result.replace(
                    /\/?>$/,
                    ` ${attribute}="${value}"$&`
                );

            }
        }

        return xml.replace(updatedTag, result);
    }
    private getNonce(): string {

        const characters =
            "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

        let nonce = "";

        for (let i = 0; i < 32; i++) {
            nonce += characters.charAt(
                Math.floor(Math.random() * characters.length)
            );
        }

        return nonce;
    }

    private escapeHtml(value: string): string {

        return value
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
}

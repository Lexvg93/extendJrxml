

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

        const nonce = this.getNonce();

        webview.html = this.getHtml(
    webview,
    htmlUri,
    cssUri,
    parserUri,
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

                    case "save":

                        webview.postMessage({
                            command: "saveCompleted",
                            message: "El guardado todavía no está implementado."
                        });

                        break;
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
                    <div class="element-item">Texto estático</div>
                    <div class="element-item">Campo de texto</div>
                    <div class="element-item">Campo de datos</div>
                    <div class="element-item">Imagen</div>
                    <div class="element-item">Línea</div>
                    <div class="element-item">Rectángulo</div>
                </div>
            </aside>

            <section id="canvas-panel">

                <div id="canvas-toolbar">
                    <span>Diseñador de informes</span>
                    <span id="zoom-level">100%</span>
                </div>

                <div id="canvas-container">

                    <div id="report-page">
                        <div id="report-title-band">
                            <span>Title</span>
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

    <script nonce="${nonce}" src="${scriptUri}"></script>

</body>
</html>`;
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

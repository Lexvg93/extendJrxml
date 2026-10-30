(function () {

    // API de comunicación con VS Code
    const vscode = acquireVsCodeApi();

    // Elementos de la interfaz
    const saveButton = document.getElementById("save-button");
    const propertiesContent = document.getElementById("properties-content");

    // SOLICITUD DE GUARDADO
    saveButton.addEventListener("click", () => {
        vscode.postMessage({
            command: "save"
        });
    });

    // MOSTRAR INFORMACIÓN DEL INFORME
    function displayReport(report) {

        const lines = [];

        lines.push(`Informe: ${report.name}`);
        lines.push("");
        lines.push("PÁGINA");
        lines.push(`Dimensiones: ${report.page.width} × ${report.page.height}`);
        lines.push(`Ancho de columna: ${report.page.columnWidth}`);
        lines.push(
            `Márgenes: izquierda ${report.page.leftMargin}, derecha ${report.page.rightMargin}, superior ${report.page.topMargin}, inferior ${report.page.bottomMargin}`
        );

        lines.push("");
        lines.push("BANDAS");

        for (const [bandName, bandList] of Object.entries(report.bands)) {

            lines.push(`${bandName}: ${bandList.length} banda(s)`);

            bandList.forEach((band, index) => {
                lines.push(
                    `  Banda ${index + 1}: altura ${band.height}, ${band.elements.length} elemento(s)`
                );

                band.elements.forEach(element => {
                    lines.push(
                        `    - ${element.type}: x=${element.x}, y=${element.y}, ancho=${element.width}, alto=${element.height}`
                    );
                });
            });
        }

        propertiesContent.textContent = lines.join("\n");

        console.log("STARK Designer: informe analizado", report);
    }

    // MENSAJES RECIBIDOS DESDE VS CODE
    window.addEventListener("message", event => {

        const message = event.data;

        switch (message.command) {

            case "documentLoaded":

                console.log("STARK Designer: documento recibido");

                try {

                    const report = window.StarkJrxmlParser.parseReport(
                        message.text
                    );

                    displayReport(report);

                } catch (error) {

                    propertiesContent.textContent =
                        `Error al analizar el JRXML: ${error.message}`;

                    console.error(error);
                }

                break;

            case "saveCompleted":

                console.log(
                    "STARK Designer:",
                    message.message
                );

                break;
        }
    });

    // NOTIFICAR QUE LA WEBVIEW ESTÁ PREPARADA
    vscode.postMessage({
        command: "ready"
    });

})();
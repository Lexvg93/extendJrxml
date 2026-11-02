
(function () {
    console.log("STARK Kraken: main.js cargado correctamente");
    // API de comunicación con VS Code
    const vscode = acquireVsCodeApi();

    // Elementos de la interfaz
    const saveButton = document.getElementById("save-button");
    const propertiesContent = document.getElementById("properties-content");
    const bandsContainer = document.getElementById("report-bands");

    // Informe actualmente cargado
    let currentReport = null;
    // Elemento actualmente seleccionado
    let selectedElementData = null;
    // Banda actualmente seleccionada
    let selectedBandData = null;


    // SOLICITUD DE GUARDADO
    saveButton.addEventListener("click", () => {

        if (!currentReport) {
            console.warn(
                "STARK Kraken: no hay ningún informe cargado para guardar."
            );

            return;
        }

        vscode.postMessage({
            command: "save",
            report: currentReport
        });

        console.log(
            "STARK Kraken: solicitud de guardado enviada",
            currentReport
        );
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

        currentReport = report;

        window.StarkDesignerRenderer.renderReport(report);

        propertiesContent.textContent = lines.join("\n");

        console.log("STARK Designer: informe analizado", report);
    }

    // MOSTRAR LAS PROPIEDADES DEL ELEMENTO SELECCIONADO
    function displayElementProperties(elementData, bandName) {

        propertiesContent.innerHTML = `
        <div class="property-section">

            <h3>ELEMENTO SELECCIONADO</h3>

            <div class="property-info">
                <span>Tipo:</span>
                <strong>${elementData.type}</strong>
            </div>

            <div class="property-info">
                <span>Banda:</span>
                <strong>${bandName}</strong>
            </div>

            <div class="property-info">
                <span>UUID:</span>
                <strong>${elementData.uuid || "Sin UUID"}</strong>
            </div>

        </div>

        <div class="property-section">

            <h3>POSICIÓN Y DIMENSIONES</h3>

            <div class="property-field">
                <label for="element-x">X</label>
                <input
                    type="number"
                    id="element-x"
                    value="${elementData.x}"
                    min="0"
                    step="1"
                >
            </div>

            <div class="property-field">
                <label for="element-y">Y</label>
                <input
                    type="number"
                    id="element-y"
                    value="${elementData.y}"
                    min="0"
                    step="1"
                >
            </div>

            <div class="property-field">
                <label for="element-width">Ancho</label>
                <input
                    type="number"
                    id="element-width"
                    value="${elementData.width}"
                    min="1"
                    step="1"
                >
            </div>

            <div class="property-field">
                <label for="element-height">Alto</label>
                <input
                    type="number"
                    id="element-height"
                    value="${elementData.height}"
                    min="1"
                    step="1"
                >
            </div>

        </div>

        ${elementData.text !== null &&
                elementData.text !== undefined
                ? `
                    <div class="property-section">
                        <h3>TEXTO</h3>
                        <div>${elementData.text}</div>
                    </div>
                `
                : ""
            }

        ${elementData.type !== "staticText" &&
                elementData.expression !== null &&
                elementData.expression !== undefined
                ? `
                    <div class="property-section">
                        <h3>EXPRESIÓN</h3>
                        <div>${elementData.expression}</div>
                    </div>
                `
                : ""
            }
    `;
        // ESCUCHAR CAMBIOS EN LAS PROPIEDADES GEOMÉTRICAS
        const geometryFields = [
            "element-x",
            "element-y",
            "element-width",
            "element-height"
        ];

        geometryFields.forEach(fieldId => {

            const input = document.getElementById(fieldId);

            input.addEventListener("change", updateElementGeometry);

        });
    }

    

    // ACTUALIZAR PROPIEDADES GEOMÉTRICAS
    function updateElementGeometry() {

        if (!selectedElementData) {
            return;
        }

        const fields = [
            { id: "element-x", property: "x", min: 0 },
            { id: "element-y", property: "y", min: 0 },
            { id: "element-width", property: "width", min: 1 },
            { id: "element-height", property: "height", min: 1 }
        ];

        if (!selectedBandData || !currentReport) {
            console.error(
                "STARK Kraken: no se puede validar la geometría sin banda e informe."
            );

            return;
        }

        for (const field of fields) {

            const input = document.getElementById(field.id);

            if (!input) {
                continue;
            }

            const value = input.valueAsNumber;

            if (
                !Number.isFinite(value) ||
                !Number.isInteger(value) ||
                value < field.min
            ) {
                input.setCustomValidity(
                    `Introduce un número entero igual o superior a ${field.min}.`
                );

                input.reportValidity();

                // RESTAURAR EL ÚLTIMO VALOR VÁLIDO
                input.value = String(selectedElementData[field.property]);

                // LIMPIAR EL ESTADO DE VALIDACIÓN
                input.setCustomValidity("");

                console.warn(
                    "STARK Kraken: valor geométrico rechazado",
                    field.property,
                    value
                );

                return;
            }

            input.setCustomValidity("");
        }
        // VALIDAR LÍMITES DE LA COLUMNA Y DE LA BANDA
        const newX = document.getElementById("element-x").valueAsNumber;
        const newY = document.getElementById("element-y").valueAsNumber;
        const newWidth = document.getElementById("element-width").valueAsNumber;
        const newHeight = document.getElementById("element-height").valueAsNumber;

        const exceedsColumn = newX + newWidth > currentReport.page.columnWidth;
        const exceedsBand = newY + newHeight > selectedBandData.height;

        if (exceedsColumn || exceedsBand) {

            console.warn(
                "STARK Kraken: geometría fuera de los límites permitidos",
                {
                    exceedsColumn,
                    exceedsBand,
                    columnWidth: currentReport.page.columnWidth,
                    bandHeight: selectedBandData.height
                }
            );

            // RESTAURAR LOS CUATRO VALORES ANTERIORES
            for (const field of fields) {

                const input = document.getElementById(field.id);

                input.value = String(selectedElementData[field.property]);
            }

            return;
        }
        for (const field of fields) {

            const input = document.getElementById(field.id);

            selectedElementData[field.property] = input.valueAsNumber;
        }

        console.log(
            "STARK Kraken: geometría actualizada",
            selectedElementData
        );

        // ACTUALIZAR REPRESENTACIÓN VISUAL
        const updated = window.StarkDesignerRenderer.updateElement(
            selectedElementData
        );

        if (updated) {
            console.log(
                "STARK Kraken: elemento actualizado visualmente"
            );
        }
    }

    // SELECCIÓN DE ELEMENTOS EN EL LIENZO
    bandsContainer.addEventListener("click", event => {
        console.log("STARK Kraken: evento de clic ejecutado");
        const target = event.target;

        if (!(target instanceof Element)) {
            return;
        }

        const selectedElement = target.closest(".jr-element");

        // Ignorar clics sobre espacios vacíos de la banda.
        if (!selectedElement || !currentReport) {
            return;
        }

        const selectedBand = selectedElement.closest(".jr-band");

        if (!selectedBand) {
            return;
        }

        const bandName = selectedBand.dataset.name;
        const bandIndex = Number(selectedBand.dataset.index);

        const bandData = currentReport.bands[bandName]?.[bandIndex];

        if (!bandData) {
            return;
        }

        const elementIndex = Number(
            selectedElement.dataset.elementIndex
        );

        if (
            !Number.isInteger(elementIndex) ||
            elementIndex < 0
        ) {
            return;
        }

        const elementData = bandData.elements[elementIndex];

        if (!elementData) {
            return;
        }
        // Guardar el elemento actualmente seleccionado.
        selectedElementData = elementData;
        // Guardar la banda a la que pertenece el elemento.
        selectedBandData = bandData;
        console.log(
            "STARK Kraken: banda seleccionada",
            selectedBandData
        );
        console.log(
            "STARK Kraken: elemento activo",
            selectedElementData
        );

        // Quitar selección anterior.
        document.querySelectorAll(".jr-element.selected").forEach(element => {
            element.classList.remove("selected");
        });

        // Resaltar el elemento actual.
        selectedElement.classList.add("selected");

        // Actualizar el panel derecho.
        displayElementProperties(elementData, bandName);

        console.log(
            "STARK Kraken: elemento seleccionado",
            elementData
        );
    });

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

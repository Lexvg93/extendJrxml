
(function () {
  console.log("STARK Kraken: main.js cargado correctamente");
  // API de comunicación con VS Code
  const vscode = acquireVsCodeApi();

  // Elementos de la interfaz
  const saveButton = document.getElementById("save-button");
  const propertiesContent = document.getElementById("properties-content");
  const bandsContainer = document.getElementById("report-bands");
  const elementsList = document.getElementById("elements-list");

  // Informe actualmente cargado
  let currentReport = null;
  // Elemento actualmente seleccionado
  let selectedElementData = null;
  // Banda actualmente seleccionada
  let selectedBandData = null;
  // ESTADO DEL ARRASTRE
  let dragState = null;
  // ESTADO DEL REDIMENSIONAMIENTO
  let resizeState = null;

  // SOLICITUD DE GUARDADO
  saveButton.addEventListener("click", () => {
    if (!currentReport) {
      console.warn("STARK Kraken: no hay ningún informe cargado para guardar.");

      return;
    }

    vscode.postMessage({
      command: "save",
      report: currentReport,
    });

    console.log("STARK Kraken: solicitud de guardado enviada", currentReport);
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
      `Márgenes: izquierda ${report.page.leftMargin}, derecha ${report.page.rightMargin}, superior ${report.page.topMargin}, inferior ${report.page.bottomMargin}`,
    );

    lines.push("");
    lines.push("BANDAS");

    for (const [bandName, bandList] of Object.entries(report.bands)) {
      lines.push(`${bandName}: ${bandList.length} banda(s)`);

      bandList.forEach((band, index) => {
        lines.push(
          `  Banda ${index + 1}: altura ${band.height}, ${band.elements.length} elemento(s)`,
        );

        band.elements.forEach((element) => {
          lines.push(
            `    - ${element.type}: x=${element.x}, y=${element.y}, ancho=${element.width}, alto=${element.height}`,
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

        ${
          elementData.text !== null && elementData.text !== undefined
            ? `
                    <div class="property-section">
                        <h3>TEXTO</h3>
                        <textarea
                            id="element-text"
                            rows="3"
                            placeholder="Introduce el texto..."
                        ></textarea>
                    </div>
                `
            : ""
        }

        ${
          elementData.type === "textField"
            ? `
            <div class="property-section">
                <h3>EXPRESIÓN</h3>
                <textarea
                    id="element-expression"
                    rows="3"
                    placeholder="Introduce una expresión JasperReports..."
                ></textarea>
            </div>
        `
            : ""
        }
    `;

    // INICIALIZAR CAMPO DE TEXTO
    const textInput = document.getElementById("element-text");

    if (textInput) {
    textInput.value = elementData.text || "";

    textInput.addEventListener("input", () => {
        selectedElementData.text = textInput.value;

        const renderedElement = Array.from(
        document.querySelectorAll(".jr-element"),
        ).find((element) => element.dataset.uuid === selectedElementData.uuid);

        if (renderedElement) {
          // Actualizar únicamente el nodo de texto.
          // Así conservamos los ocho controladores de Resize.
          if (renderedElement.firstChild?.nodeType === Node.TEXT_NODE) {
            renderedElement.firstChild.nodeValue = selectedElementData.text;
          }

          renderedElement.title = selectedElementData.text;
        }

        console.log("STARK Kraken: texto actualizado", selectedElementData.text);
    });
    }


        const expressionInput = document.getElementById("element-expression");

    if (expressionInput) {
        expressionInput.value = elementData.expression || "";

        expressionInput.addEventListener("input", () => {
            selectedElementData.expression = expressionInput.value;

            const renderedElement = Array.from(
                document.querySelectorAll(".jr-element")
            ).find(
                element => element.dataset.uuid === selectedElementData.uuid
            );

            if (renderedElement) {
                const displayExpression =
                    selectedElementData.expression || "Campo de texto";

                if (renderedElement.firstChild?.nodeType === Node.TEXT_NODE) {
                    renderedElement.firstChild.nodeValue = displayExpression;
                }

                renderedElement.title = displayExpression;
            }
        });
    }
    // ESCUCHAR CAMBIOS EN LAS PROPIEDADES GEOMÉTRICAS
    const geometryFields = [
      "element-x",
      "element-y",
      "element-width",
      "element-height",
    ];

    geometryFields.forEach((fieldId) => {
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
      { id: "element-height", property: "height", min: 1 },
    ];

    if (!selectedBandData || !currentReport) {
      console.error(
        "STARK Kraken: no se puede validar la geometría sin banda e informe.",
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
          `Introduce un número entero igual o superior a ${field.min}.`,
        );

        input.reportValidity();

        // RESTAURAR EL ÚLTIMO VALOR VÁLIDO
        input.value = String(selectedElementData[field.property]);

        // LIMPIAR EL ESTADO DE VALIDACIÓN
        input.setCustomValidity("");

        console.warn(
          "STARK Kraken: valor geométrico rechazado",
          field.property,
          value,
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
      console.warn("STARK Kraken: geometría fuera de los límites permitidos", {
        exceedsColumn,
        exceedsBand,
        columnWidth: currentReport.page.columnWidth,
        bandHeight: selectedBandData.height,
      });

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

    console.log("STARK Kraken: geometría actualizada", selectedElementData);

    // ACTUALIZAR REPRESENTACIÓN VISUAL
    const updated =
      window.StarkDesignerRenderer.updateElement(selectedElementData);

    if (updated) {
      console.log("STARK Kraken: elemento actualizado visualmente");
    }
  }

  // SELECCIONAR UN ELEMENTO DEL LIENZO
  function selectElement(target) {
    console.log("STARK Kraken: evento de selección ejecutado");

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

    const elementIndex = Number(selectedElement.dataset.elementIndex);

    if (!Number.isInteger(elementIndex) || elementIndex < 0) {
      return;
    }

    const elementData = bandData.elements[elementIndex];

    if (!elementData) {
      return;
    }

    // Guardar el elemento actualmente seleccionado.
    selectedElementData = elementData;

    // Guardar la banda correspondiente.
    selectedBandData = bandData;

    console.log("STARK Kraken: banda seleccionada", selectedBandData);

    console.log("STARK Kraken: elemento activo", selectedElementData);

    // Quitar selección anterior.
    document.querySelectorAll(".jr-element.selected").forEach((element) => {
      element.classList.remove("selected");
    });

    // Resaltar elemento actual.
    selectedElement.classList.add("selected");

    // Actualizar inspector.
    displayElementProperties(elementData, bandName);

    console.log("STARK Kraken: elemento seleccionado", elementData);
  }

  // INICIAR ARRASTRE DESDE LA PALETA
  elementsList.addEventListener("dragstart", (event) => {
    const element = event.target.closest(".element-item");

    if (!element) {
      return;
    }

    const elementType = element.dataset.elementType;

    if (!elementType) {
      return;
    }

    event.dataTransfer.setData("application/stark-element", elementType);

    event.dataTransfer.effectAllowed = "copy";

    console.log(
      "STARK Kraken: componente preparado para arrastrar",
      elementType,
    );
  });

  // PERMITIR SOLTAR COMPONENTES SOBRE LAS BANDAS
  bandsContainer.addEventListener("dragover", (event) => {
    event.preventDefault();

    event.dataTransfer.dropEffect = "copy";
  });

  // DETECTAR CUANDO SE SUELTA UN COMPONENTE
  // CREAR ELEMENTOS DESDE LA PALETA
bandsContainer.addEventListener("drop", event => {

    event.preventDefault();

    const elementType = event.dataTransfer.getData(
        "application/stark-element"
    );

    // Permitir los tipos de elementos actualmente soportados.
    if (
        !["staticText", "textField"].includes(elementType) ||
        !currentReport
    ) {
        return;
    }

    // Identificar la banda de destino.
    const band = event.target.closest(".jr-band");

    if (!band) {
        return;
    }

    const bandName = band.dataset.name;
    const bandIndex = Number(band.dataset.index);

    const bandData = currentReport.bands[bandName]?.[bandIndex];

    if (!bandData) {
        return;
    }

    const bandContent = band.querySelector(".jr-band-content");

    if (!bandContent) {
        return;
    }

    // Calcular coordenadas relativas a la banda.
    const rect = bandContent.getBoundingClientRect();

    const width = Math.min(100, currentReport.page.columnWidth);
    const height = Math.min(20, bandData.height);

    const x = Math.max(
        0,
        Math.min(
            Math.round(event.clientX - rect.left),
            currentReport.page.columnWidth - width
        )
    );

    const y = Math.max(
        0,
        Math.min(
            Math.round(event.clientY - rect.top),
            bandData.height - height
        )
    );

    // Crear el objeto del informe.
    // Crear el objeto del informe según su tipo.
    const newElement = {
        type: elementType,
        uuid: crypto.randomUUID(),
        x: x,
        y: y,
        width: width,
        height: height,
        text: elementType === "staticText" ? "Texto estático" : null,
        expression: elementType === "textField" ? "" : null
    };

    // Incorporarlo al modelo del informe.
    bandData.elements.push(newElement);

    console.log(
        "STARK Kraken: nuevo elemento creado",
        newElement
    );

    // Volver a representar el informe.
    window.StarkDesignerRenderer.renderReport(currentReport);

    // Localizar y seleccionar automáticamente el nuevo elemento.
    const renderedBand = Array.from(
        bandsContainer.querySelectorAll(".jr-band")
    ).find(candidate =>
        candidate.dataset.name === bandName &&
        candidate.dataset.index === String(bandIndex)
    );

    if (renderedBand) {

        const renderedElements = renderedBand.querySelectorAll(".jr-element");

        const newElementNode = renderedElements[
            renderedElements.length - 1
        ];

        if (newElementNode) {
            selectElement(newElementNode);
        }
    }

    console.log(
        "STARK Kraken: elemento representado y seleccionado"
    );

});
  // SELECCIÓN DE ELEMENTOS EN EL LIENZO
  bandsContainer.addEventListener("click", (event) => {
    selectElement(event.target);
  });

  // INICIAR ARRASTRE DE ELEMENTOS
  bandsContainer.addEventListener("pointerdown", (event) => {
    if (!(event.target instanceof Element)) {
      return;
    }

    // Detectar si se ha pulsado un controlador de Resize.
    const handle = event.target.closest(".resize-handle");

    if (handle) {
      const element = handle.closest(".jr-element");

      if (!element || !currentReport) {
        return;
      }

      selectElement(element);

      if (!selectedElementData || !selectedBandData) {
        return;
      }

      resizeState = {
        element: element,
        handle: handle,
        direction: Array.from(handle.classList).find((position) =>
          ["nw", "n", "ne", "e", "se", "s", "sw", "w"].includes(position),
        ),
        pointerId: event.pointerId,
        startPointerX: event.clientX,
        startPointerY: event.clientY,
        startElementX: selectedElementData.x,
        startElementY: selectedElementData.y,
        startWidth: selectedElementData.width,
        startHeight: selectedElementData.height,
      };

      handle.setPointerCapture(event.pointerId);

      console.log("STARK Kraken: inicio de Resize", resizeState);

      return;
    }

    const element = event.target.closest(".jr-element");

    if (!element || !currentReport) {
      return;
    }

    // Seleccionar el elemento antes de iniciar el arrastre.
    selectElement(element);

    if (!selectedElementData || !selectedBandData) {
      return;
    }

    // Registrar el estado inicial del movimiento.
    dragState = {
      element: element,
      pointerId: event.pointerId,
      startPointerX: event.clientX,
      startPointerY: event.clientY,

      startElementX: selectedElementData.x,
      startElementY: selectedElementData.y,
    };

    // Capturar el puntero durante el arrastre.
    element.setPointerCapture(event.pointerId);

    console.log("STARK Kraken: inicio de arrastre", dragState);
  });

  // ACTUALIZAR POSICIÓN DURANTE EL ARRASTRE
  bandsContainer.addEventListener("pointermove", (event) => {
    // ========================================
    // REDIMENSIONAMIENTO
    // ========================================

    if (resizeState) {
      if (event.pointerId !== resizeState.pointerId) {
        return;
      }

      const deltaX = event.clientX - resizeState.startPointerX;
      const deltaY = event.clientY - resizeState.startPointerY;

      let newX = resizeState.startElementX;
      let newY = resizeState.startElementY;
      let newWidth = resizeState.startWidth;
      let newHeight = resizeState.startHeight;

      const direction = resizeState.direction;

      // Controladores del lado izquierdo.
      if (direction.includes("w")) {
        newX = resizeState.startElementX + deltaX;
        newWidth = resizeState.startWidth - deltaX;
      }

      // Controladores del lado derecho.
      if (direction.includes("e")) {
        newWidth = resizeState.startWidth + deltaX;
      }

      // Controladores del lado superior.
      if (direction.includes("n")) {
        newY = resizeState.startElementY + deltaY;
        newHeight = resizeState.startHeight - deltaY;
      }

      // Controladores del lado inferior.
      if (direction.includes("s")) {
        newHeight = resizeState.startHeight + deltaY;
      }

      // ========================================
      // VALIDAR DIMENSIONES MÍNIMAS
      // ========================================

      if (newWidth < 1 || newHeight < 1) {
        return;
      }

      // ========================================
      // VALIDAR LÍMITES DE LA COLUMNA Y BANDA
      // ========================================

      const exceedsColumn =
        newX < 0 || newX + newWidth > currentReport.page.columnWidth;

      const exceedsBand =
        newY < 0 || newY + newHeight > selectedBandData.height;

      if (exceedsColumn || exceedsBand) {
        return;
      }

      // ========================================
      // ACTUALIZAR MODELO
      // ========================================

      selectedElementData.x = Math.round(newX);
      selectedElementData.y = Math.round(newY);
      selectedElementData.width = Math.round(newWidth);
      selectedElementData.height = Math.round(newHeight);

      // SINCRONIZAR INSPECTOR DE PROPIEDADES
      const geometryValues = {
        "element-x": selectedElementData.x,
        "element-y": selectedElementData.y,
        "element-width": selectedElementData.width,
        "element-height": selectedElementData.height,
      };

      for (const [fieldId, value] of Object.entries(geometryValues)) {
        const input = document.getElementById(fieldId);

        if (input) {
          input.value = String(value);
        }
      }

      // ========================================
      // ACTUALIZAR REPRESENTACIÓN VISUAL
      // ========================================

      window.StarkDesignerRenderer.updateElement(selectedElementData);

      return;
    }

    // ========================================
    // DRAG & DROP EXISTENTE
    // ========================================

    if (!dragState || !selectedElementData || !selectedBandData) {
      return;
    }

    const deltaX = event.clientX - dragState.startPointerX;
    const deltaY = event.clientY - dragState.startPointerY;

    const newX = Math.round(dragState.startElementX + deltaX);
    const newY = Math.round(dragState.startElementY + deltaY);

    const maxX = currentReport.page.columnWidth - selectedElementData.width;
    const maxY = selectedBandData.height - selectedElementData.height;

    const boundedX = Math.max(0, Math.min(newX, maxX));
    const boundedY = Math.max(0, Math.min(newY, maxY));

    selectedElementData.x = boundedX;
    selectedElementData.y = boundedY;

    window.StarkDesignerRenderer.updateElement(selectedElementData);
  });

  // FINALIZAR ARRASTRE DE ELEMENTOS
  window.addEventListener("pointerup", (event) => {
    if (resizeState && event.pointerId === resizeState.pointerId) {
      console.log("STARK Kraken: Resize finalizado", selectedElementData);

      resizeState = null;

      return;
    }

    if (!dragState || event.pointerId !== dragState.pointerId) {
      return;
    }

    console.log("STARK Kraken: arrastre finalizado", selectedElementData);

    dragState = null;
  });

  window.addEventListener("pointercancel", (event) => {
    if (resizeState && event.pointerId === resizeState.pointerId) {
      resizeState = null;

      console.log("STARK Kraken: Resize cancelado");

      return;
    }

    if (!dragState || event.pointerId !== dragState.pointerId) {
      return;
    }

    dragState = null;

    console.log("STARK Kraken: arrastre cancelado");
  });

  // MENSAJES RECIBIDOS DESDE VS CODE
  window.addEventListener("message", (event) => {
    const message = event.data;

    switch (message.command) {
      case "documentLoaded":
        console.log("STARK Designer: documento recibido");

        try {
          const report = window.StarkJrxmlParser.parseReport(message.text);

          displayReport(report);
        } catch (error) {
          propertiesContent.textContent = `Error al analizar el JRXML: ${error.message}`;

          console.error(error);
        }

        break;

      case "saveCompleted":
        console.log("STARK Designer:", message.message);

        break;
    }
  });

  // NOTIFICAR QUE LA WEBVIEW ESTÁ PREPARADA
  vscode.postMessage({
    command: "ready",
  });
})();

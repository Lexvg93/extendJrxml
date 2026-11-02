// Recibir el objeto report generado por el parser.

// Crear las bandas dinámicamente.

// Respetar la altura de cada banda.

// Crear los elementos dentro de su banda.

// Respetar x, y, width y height originales.


(function () {

    const BAND_LABEL_HEIGHT = 20;

    /**
     * Crea un elemento HTML con una clase CSS.
     */
    function createElement(tagName, className) {

        const element = document.createElement(tagName);

        element.className = className;

        return element;
    }


    /**
     * Representa visualmente un elemento JRXML.
     */
    function renderElement(elementData, elementIndex) {

        if (!elementData.uuid) {
            throw new Error(
                "No se puede representar un elemento sin UUID."
            );
        }

        const element = createElement(
            "div",
            "jr-element"
        );

        element.dataset.type = elementData.type;
        element.dataset.elementIndex = elementIndex;

        if (elementData.uuid) {
            element.dataset.uuid = elementData.uuid;
        }

        element.style.left = `${elementData.x}px`;
        element.style.top = `${elementData.y}px`;
        element.style.width = `${elementData.width}px`;
        element.style.height = `${elementData.height}px`;

        let displayText = "";

        switch (elementData.type) {

            case "staticText":
                displayText = elementData.text || "Texto estático";
                break;

            case "textField":
                displayText = elementData.expression || "Campo de texto";
                break;

            case "image":
                displayText = elementData.expression || "Imagen";
                break;

            case "line":
                displayText = "Línea";
                break;

            case "rectangle":
                displayText = "Rectángulo";
                break;

            case "ellipse":
                displayText = "Elipse";
                break;

            default:
                displayText = elementData.type;
                break;
        }

        element.textContent = displayText;

        // Mostrar el contenido completo al pasar el cursor.
        element.title = displayText;

        return element;
    }

    /**
    * Actualiza visualmente un elemento del informe.
    */
    function updateElement(elementData) {

        const element = document.querySelector(
            `.jr-element[data-uuid="${elementData.uuid}"]`
        );

        if (!element) {
            return false;
        }

        element.style.left = `${elementData.x}px`;
        element.style.top = `${elementData.y}px`;
        element.style.width = `${elementData.width}px`;
        element.style.height = `${elementData.height}px`;

        return true;
    }


    /**
     * Representa una banda del informe.
     */
    function renderBand(bandName, bandData, index) {

        const band = createElement(
            "div",
            "jr-band"
        );

        band.dataset.name = bandName;
        band.dataset.index = index;

        band.style.height = `${bandData.height}px`;

        const label = createElement(
            "div",
            "jr-band-label"
        );

        label.textContent = bandName;

        const content = createElement(
            "div",
            "jr-band-content"
        );

        content.style.height = `${bandData.height}px`;

        for (const [elementIndex, elementData] of bandData.elements.entries()) {

            const element = renderElement(
                elementData,
                elementIndex
            );

            content.appendChild(element);
        }

        band.appendChild(label);
        band.appendChild(content);

        return band;
    }

    /**
     * Representa todas las bandas del informe.
     */
    function renderReport(report) {

        const page = document.getElementById("report-page");

        const bandsContainer = document.getElementById(
            "report-bands"
        );

        if (!page || !bandsContainer) {
            throw new Error(
                "No se encontraron los contenedores del diseñador."
            );
        }

        bandsContainer.replaceChildren();

        page.style.width = `${report.page.width}px`;
        page.style.height = `${report.page.height}px`;

        bandsContainer.style.width =
            `${report.page.columnWidth}px`;

        bandsContainer.style.marginLeft =
            `${report.page.leftMargin}px`;

        bandsContainer.style.marginTop =
            `${report.page.topMargin}px`;

        for (const [bandName, bandList] of Object.entries(report.bands)) {

            bandList.forEach((bandData, index) => {

                const band = renderBand(
                    bandName,
                    bandData,
                    index
                );

                bandsContainer.appendChild(band);

            });
        }

        console.log(
            "STARK Kraken: lienzo representado",
            report
        );
    }

    window.StarkDesignerRenderer = {
        renderReport,
        updateElement
    };

})();

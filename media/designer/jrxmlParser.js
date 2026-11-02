
(function () {

    function getDirectChild(parent, name) {
        return Array.from(parent.children).find(
            child => child.localName === name
        ) || null;
    }

    function getDirectChildren(parent, name) {
        return Array.from(parent.children).filter(
            child => child.localName === name
        );
    }

    function getAttributeNumber(element, attribute, fallback = 0) {
        const value = element.getAttribute(attribute);

        if (value === null || value.trim() === "") {
            return fallback;
        }

        const number = Number(value);

        return Number.isFinite(number) ? number : fallback;
    }

    
function getElementData(element) {

    const reportElement = getDirectChild(
        element,
        "reportElement"
    );

    const textElement = getDirectChild(
        element,
        "text"
    );

    const textFieldExpression = getDirectChild(
        element,
        "textFieldExpression"
    );

    const imageExpression = getDirectChild(
        element,
        "imageExpression"
    );

    const expressionElement =
        textFieldExpression ||
        textElement ||
        imageExpression;

    return {
        type: element.localName,

        x: reportElement
            ? getAttributeNumber(reportElement, "x")
            : 0,

        y: reportElement
            ? getAttributeNumber(reportElement, "y")
            : 0,

        width: reportElement
            ? getAttributeNumber(reportElement, "width")
            : 0,

        height: reportElement
            ? getAttributeNumber(reportElement, "height")
            : 0,

        uuid: reportElement
            ? reportElement.getAttribute("uuid")
            : null,

        // Contenido literal de staticText.
        text: textElement
            ? textElement.textContent
            : null,

        // Expresión original del elemento.
        expression: expressionElement
            ? expressionElement.textContent.trim()
            : null
    };
}


    function parseBand(band) {

        const elements = Array.from(band.children)
            .filter(child => child.localName !== "property")
            .map(getElementData);

        return {
            height: getAttributeNumber(band, "height"),
            elements
        };
    }

    function parseReport(xmlText) {

        const parser = new DOMParser();

        const xmlDocument = parser.parseFromString(
            xmlText,
            "application/xml"
        );

        const parserError = xmlDocument.querySelector("parsererror");

        if (parserError) {
            throw new Error(
                "El archivo JRXML no contiene un XML válido."
            );
        }

        const root = xmlDocument.documentElement;

        if (root.localName !== "jasperReport") {
            throw new Error(
                "El documento no contiene un elemento jasperReport."
            );
        }

        const bands = {};

        for (const section of Array.from(root.children)) {

            const sectionBands = getDirectChildren(
                section,
                "band"
            );

            if (sectionBands.length > 0) {
                bands[section.localName] = sectionBands.map(parseBand);
            }
        }

        return {
            name: root.getAttribute("name"),

            page: {
                width: getAttributeNumber(root, "pageWidth"),
                height: getAttributeNumber(root, "pageHeight"),
                columnWidth: getAttributeNumber(root, "columnWidth"),
                leftMargin: getAttributeNumber(root, "leftMargin"),
                rightMargin: getAttributeNumber(root, "rightMargin"),
                topMargin: getAttributeNumber(root, "topMargin"),
                bottomMargin: getAttributeNumber(root, "bottomMargin")
            },

            bands,

            sourceXml: xmlText
        };
    }

    window.StarkJrxmlParser = {
        parseReport
    };

})();

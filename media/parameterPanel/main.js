
(() => {
    const vscode = acquireVsCodeApi();

    const form = document.getElementById('parameter-form');
    const container = document.getElementById('parameters-container');
    const errorMessage = document.getElementById('error-message');
    const generateButton = document.getElementById('generate-button');
    const cancelButton = document.getElementById('cancel-button');

    function mostrarError(mensaje) {
        errorMessage.textContent = mensaje;
    }

    function limpiarError() {
        errorMessage.textContent = '';
    }

    function crearCampo(parametro) {
        const grupo = document.createElement('div');
        grupo.className = 'parameter-field';

        const etiqueta = document.createElement('label');
        etiqueta.htmlFor = `parameter-${parametro.name}`;
        etiqueta.textContent = parametro.name;

        const tipo = document.createElement('small');
        tipo.className = 'parameter-type';
        tipo.textContent = parametro.type;

        let campo;

        if (parametro.type === 'java.lang.Boolean') {
            campo = document.createElement('select');

            const opciones = [
                { value: '', texto: 'Selecciona un valor' },
                { value: 'true', texto: 'Sí (true)' },
                { value: 'false', texto: 'No (false)' }
            ];

            for (const opcion of opciones) {
                const elemento = document.createElement('option');
                elemento.value = opcion.value;
                elemento.textContent = opcion.texto;
                campo.appendChild(elemento);
            }
        } else {
            campo = document.createElement('input');

            if (
                ['java.lang.Integer', 'java.lang.Short', 'java.lang.Byte']
                    .includes(parametro.type)
            ) {
                campo.type = 'number';
                campo.step = '1';
            } else if (
                ['java.lang.Long', 'java.lang.Double', 'java.lang.Float']
                    .includes(parametro.type)
            ) {
                campo.type = 'number';
                campo.step = 'any';
            } else {
                campo.type = 'text';
            }

            campo.placeholder = `Introduce ${parametro.name}`;
        }

        campo.id = `parameter-${parametro.name}`;
        campo.name = parametro.name;
        campo.dataset.javaType = parametro.type;

        grupo.appendChild(etiqueta);
        grupo.appendChild(tipo);
        grupo.appendChild(campo);

        return grupo;
    }

    function mostrarParametros(parametros) {
        container.replaceChildren();

        for (const parametro of parametros) {
            container.appendChild(crearCampo(parametro));
        }
        generateButton.disabled = parametros.length === 0;
        limpiarError();
    }

    window.addEventListener('message', (evento) => {
        const mensaje = evento.data;

        if (mensaje.command === 'showParameters') {
            mostrarParametros(mensaje.parameters);
        }

        if (mensaje.command === 'showError') {
            mostrarError(mensaje.message);
            generateButton.disabled = container.children.length === 0;
        }
    });

    form.addEventListener('submit', (evento) => {
        evento.preventDefault();
        limpiarError();

        const valores = {};

        for (const campo of container.querySelectorAll('input, select')) {
            valores[campo.name] = campo.value;
        }

        generateButton.disabled = true;
        vscode.postMessage({
            command: 'generatePdf',
            values: valores
        });
    });

    cancelButton.addEventListener('click', () => {
        vscode.postMessage({
            command: 'cancel'
        });
    });

    generateButton.disabled = true;

    vscode.postMessage({
    command: 'ready'
});
})();


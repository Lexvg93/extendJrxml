const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const source = path.join(projectRoot, 'java', 'target', 'runtime');
const destination = path.join(
    projectRoot,
    'resources',
    'java-runtime'
);

if(!fs.existsSync(source)){
    console.error(
        'No se encuentra el runtime. Ejecuta Maven primero.'
    );
    process.exit(1);
}

fs.rmSync(destination, {recursive: true, force:true});
fs.mkdirSync(destination, {recursive: true});

fs.cpSync(source, destination, {recursive: true});

console.log('Runtime Java copiado correctamente');
console.log(`Destino: ${destination}`);
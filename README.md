# JasperReports Tools for VS Code

Extensión de Visual Studio Code para trabajar con informes JasperReports desde el editor.

## Funcionalidades

- **Compilar informe:** convierte un archivo `.jrxml` en un archivo `.jasper`.
- **Previsualizar informe:** genera un PDF a partir de un archivo `.jrxml` y lo abre con la aplicación predeterminada del sistema.

## Requisitos

- Visual Studio Code compatible con la versión declarada en `package.json`.
- Java 21 instalado y accesible desde el sistema mediante el comando `java`.
- Un archivo de informe JasperReports con extensión `.jrxml`.

La extensión incluye su propio motor Java y las dependencias de JasperReports 6.21.5. No necesita el proyecto externo `libreria` ni ejecutar Maven para utilizar los comandos.

## Uso

1. Abre Visual Studio Code.
2. Abre la paleta de comandos.
3. Ejecuta **JasperReports: Compilar informe** y selecciona un archivo `.jrxml` para generar el `.jasper`.
4. Ejecuta **JasperReports: Previsualizar informe** y selecciona un archivo `.jrxml` para generar y abrir el PDF.

Los archivos generados se guardan junto al informe de origen, salvo que se indique otra ruta mediante el motor Java.

## Desarrollo

Para compilar el código TypeScript:

```bash
npm run compile
```

Para generar el runtime Java y copiar sus dependencias:

```bash
npm run package:runtime
```

Para generar el paquete instalable `.vsix`:

```bash
npm run package:vsix
```

## Tecnología

- TypeScript
- Visual Studio Code Extension API
- Java 21
- Maven
- JasperReports 6.21.5

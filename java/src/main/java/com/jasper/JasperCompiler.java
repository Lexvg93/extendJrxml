
package com.jasper;

import java.nio.file.Files;
import java.nio.file.Path;

import net.sf.jasperreports.engine.JasperCompileManager;

public class JasperCompiler {

    public static void main(String[] args) {
        if (args.length < 1 || args.length > 2) {
            System.err.println(
                "Uso: java JasperCompiler <informe.jrxml> [salida.jasper]"
            );
            System.exit(1);
        }

        Path archivoOrigen = Path.of(args[0]).toAbsolutePath();

        if (!Files.isRegularFile(archivoOrigen)) {
            System.err.println(
                "Error: no existe el archivo JRXML: " + archivoOrigen
            );
            System.exit(1);
        }

        Path archivoDestino;

        if (args.length == 2) {
            archivoDestino = Path.of(args[1]).toAbsolutePath();
        } else {
            String nombre = archivoOrigen.getFileName().toString();

            if (!nombre.toLowerCase().endsWith(".jrxml")) {
                System.err.println(
                    "Error: el archivo de entrada debe tener extensión .jrxml"
                );
                System.exit(1);
            }

            String nombreJasper =
                nombre.substring(0, nombre.length() - ".jrxml".length())
                + ".jasper";

            archivoDestino = archivoOrigen.resolveSibling(nombreJasper);
        }

        try {
            Path directorio = archivoDestino.getParent();

            if (directorio != null) {
                Files.createDirectories(directorio);
            }

            JasperCompileManager.compileReportToFile(
                archivoOrigen.toString(),
                archivoDestino.toString()
            );

            System.out.println("Compilación completada correctamente.");
            System.out.println("JRXML: " + archivoOrigen);
            System.out.println("JASPER: " + archivoDestino);

        } catch (Exception e) {
            System.err.println("Error al compilar el informe:");
            System.err.println(e.getMessage());
            System.exit(1);
        }
    }
}
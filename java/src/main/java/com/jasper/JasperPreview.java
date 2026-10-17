package com.jasper;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HashMap;
import java.util.Map;

import net.sf.jasperreports.engine.JREmptyDataSource;
import net.sf.jasperreports.engine.JasperCompileManager;
import net.sf.jasperreports.engine.JasperExportManager;
import net.sf.jasperreports.engine.JasperFillManager;
import net.sf.jasperreports.engine.JasperPrint;
import net.sf.jasperreports.engine.JasperReport;

public class JasperPreview {

    public static void main(String[] args) {
        if (args.length < 1 || args.length > 2) {
            System.err.println(
                "Uso: java JasperPreview <informe.jrxml> [salida.pdf]"
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

        String nombre = archivoOrigen.getFileName().toString();

        if (!nombre.toLowerCase().endsWith(".jrxml")) {
            System.err.println(
                "Error: el archivo de entrada debe tener extensión .jrxml"
            );
            System.exit(1);
        }

        Path archivoDestino;

        if (args.length == 2) {
            archivoDestino = Path.of(args[1]).toAbsolutePath();
        } else {
            String nombrePdf =
                nombre.substring(0, nombre.length() - ".jrxml".length())
                + ".pdf";

            archivoDestino = archivoOrigen.resolveSibling(nombrePdf);
        }

        try {
            Path directorio = archivoDestino.getParent();

            if (directorio != null) {
                Files.createDirectories(directorio);
            }

            JasperReport informe = JasperCompileManager.compileReport(
                archivoOrigen.toString()
            );

            Map<String, Object> parametros = new HashMap<>();

            JasperPrint informeRellenado = JasperFillManager.fillReport(
                informe,
                parametros,
                new JREmptyDataSource(1)
            );

            JasperExportManager.exportReportToPdfFile(
                informeRellenado,
                archivoDestino.toString()
            );

            System.out.println("PDF generado correctamente.");
            System.out.println("JRXML: " + archivoOrigen);
            System.out.println("PDF: " + archivoDestino);

        } catch (Exception e) {
            System.err.println("Error al generar el PDF:");
            System.err.println(e.getMessage());
            System.exit(1);
        }
    }
}

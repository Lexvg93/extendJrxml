package com.jasper;

import net.sf.jasperreports.engine.JRParameter;
import net.sf.jasperreports.engine.JasperCompileManager;
import net.sf.jasperreports.engine.JasperReport;

import java.nio.file.Files;
import java.nio.file.Path;

public class JasperParameterInspector {

    public static void main(String[] args) {

        if (args.length != 1) {
            System.err.println(
                "Uso: java JasperParameterInspector <informe.jrxml>"
            );
            System.exit(1);
        }

        Path archivoJrxml = Path.of(args[0]).toAbsolutePath();

        if (!Files.isRegularFile(archivoJrxml)) {
            System.err.println(
                "No existe el archivo: " + archivoJrxml
            );
            System.exit(1);
        }

        try {
            JasperReport informe =
                JasperCompileManager.compileReport(
                    archivoJrxml.toString()
                );

            System.out.println("Parámetros del informe:");

            int cantidad = 0;

            for (JRParameter parametro : informe.getParameters()) {

                if (parametro.isSystemDefined()) {
                    continue;
                }

                System.out.println(
                    "Nombre: " + parametro.getName()
                    + " | Tipo: "
                    + parametro.getValueClassName()
                );

                cantidad++;
            }

            System.out.println(
                "Total de parámetros de usuario: " + cantidad
            );

        } catch (Exception e) {
            System.err.println(
                "Error al inspeccionar los parámetros:"
            );
            System.err.println(e.getMessage());
            System.exit(1);
        }
    }
}

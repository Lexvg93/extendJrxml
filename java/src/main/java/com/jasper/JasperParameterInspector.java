package com.jasper;


import java.nio.file.Files;
import java.nio.file.Path;

import net.sf.jasperreports.engine.JRParameter;
import net.sf.jasperreports.engine.JasperCompileManager;
import net.sf.jasperreports.engine.JasperReport;

public class JasperParameterInspector {

    public static void main(String[] args) {

        if (args.length != 1) {
            System.err.println(
                "Uso: java JasperParameterInspector <informe.jrxml>"
            );
            System.exit(1);
            return;
        }

        Path archivoJrxml = Path.of(args[0]).toAbsolutePath();

        if (!Files.isRegularFile(archivoJrxml)) {
            System.err.println(
                "No existe el archivo: " + archivoJrxml
            );
            System.exit(1);
            return;
        }

        try {
            JasperReport informe =
                JasperCompileManager.compileReport(
                    archivoJrxml.toString()
                );

            StringBuilder json = new StringBuilder();

            json.append("{");
            json.append("\"success\":true,");
            json.append("\"parameters\":[");

            int cantidad = 0;

            for (JRParameter parametro : informe.getParameters()) {

                if (parametro.isSystemDefined()) {
                    continue;
                }

                if (cantidad > 0) {
                    json.append(",");
                }

                json.append("{");
                json.append("\"name\":\"")
                    .append(escaparJson(parametro.getName()))
                    .append("\",");

                json.append("\"type\":\"")
                    .append(escaparJson(parametro.getValueClassName()))
                    .append("\",");

                json.append("\"hasDefaultValue\":")
                    .append(parametro.getDefaultValueExpression() != null);

                json.append("}");

                cantidad++;
            }

            json.append("],");
            json.append("\"total\":").append(cantidad);
            json.append("}");

            System.out.println(json);

        } catch (Exception e) {
            System.err.println(
                "Error al inspeccionar los parámetros:"
            );
            System.err.println(e.getMessage());
            System.exit(1);
        }
    }

    private static String escaparJson(String valor) {

        if (valor == null) {
            return "";
        }

        return valor
            .replace("\\", "\\\\")
            .replace("\"", "\\\"")
            .replace("\b", "\\b")
            .replace("\f", "\\f")
            .replace("\n", "\\n")
            .replace("\r", "\\r")
            .replace("\t", "\\t");
    }
}

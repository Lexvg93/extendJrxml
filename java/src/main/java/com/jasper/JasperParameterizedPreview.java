package com.jasper;


import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HashMap;
import java.util.Map;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import net.sf.jasperreports.engine.JRParameter;
import net.sf.jasperreports.engine.JasperCompileManager;
import net.sf.jasperreports.engine.JasperExportManager;
import net.sf.jasperreports.engine.JasperFillManager;
import net.sf.jasperreports.engine.JasperPrint;
import net.sf.jasperreports.engine.JasperReport;

public class JasperParameterizedPreview {

    public static void main(String[] args) {

        if (args.length != 3) {
            System.err.println(
                "Uso: java JasperParameterizedPreview "
                + "<informe.jrxml> <parametros.json> <salida.pdf>"
            );
            System.exit(1);
            return;
        }

        Path archivoJrxml = Path.of(args[0]).toAbsolutePath();
        Path archivoParametros = Path.of(args[1]).toAbsolutePath();
        Path archivoPdf = Path.of(args[2]).toAbsolutePath();

        if (!Files.isRegularFile(archivoJrxml)) {
            System.err.println(
                "No existe el archivo JRXML: " + archivoJrxml
            );
            System.exit(1);
            return;
        }

        if (!Files.isRegularFile(archivoParametros)) {
            System.err.println(
                "No existe el archivo JSON de parámetros: "
                + archivoParametros
            );
            System.exit(1);
            return;
        }

        try {
            ObjectMapper objectMapper = new ObjectMapper();

            Map<String, Object> valores =
                objectMapper.readValue(
                    archivoParametros.toFile(),
                    new TypeReference<Map<String, Object>>() {}
                );

            JasperReport informe =
                JasperCompileManager.compileReport(
                    archivoJrxml.toString()
                );

            Map<String, Object> parametros = new HashMap<>();

            for (JRParameter parametro : informe.getParameters()) {

                if (parametro.isSystemDefined()) {
                    continue;
                }

                String nombre = parametro.getName();

                if (!valores.containsKey(nombre)) {
                    continue;
                }

                Object valor = valores.get(nombre);
                Class<?> tipoEsperado = parametro.getValueClass();

                if (valor != null && tipoEsperado != null) {
                    Object valorConvertido =
                        convertirValor(valor, tipoEsperado, nombre);

                    parametros.put(nombre, valorConvertido);
                } else {
                    parametros.put(nombre, valor);
                }
            }

            Path directorio = archivoPdf.getParent();

            if (directorio != null) {
                Files.createDirectories(directorio);
            }

            JasperPrint informeRellenado =
                JasperFillManager.fillReport(
                    informe,
                    parametros,
                    new net.sf.jasperreports.engine.JREmptyDataSource(1)
                );

            JasperExportManager.exportReportToPdfFile(
                informeRellenado,
                archivoPdf.toString()
            );

            System.out.println("PDF generado correctamente.");
            System.out.println("PDF: " + archivoPdf);

        } catch (Exception e) {
            System.err.println(
                "Error al generar el informe con parámetros:"
            );
            System.err.println(e.getMessage());
            System.exit(1);
        }
    }

    private static Object convertirValor(
        Object valor,
        Class<?> tipoEsperado,
        String nombreParametro
    ) throws IOException {

        try {
            if (tipoEsperado.isInstance(valor)) {
                return valor;
            }

            if (tipoEsperado == String.class) {
                return valor.toString();
            }

            if (tipoEsperado == Integer.class
                    || tipoEsperado == int.class) {
                return Integer.valueOf(valor.toString());
            }

            if (tipoEsperado == Long.class
                    || tipoEsperado == long.class) {
                return Long.valueOf(valor.toString());
            }

            if (tipoEsperado == Double.class
                    || tipoEsperado == double.class) {
                return Double.valueOf(valor.toString());
            }

            if (tipoEsperado == Float.class
                    || tipoEsperado == float.class) {
                return Float.valueOf(valor.toString());
            }

            if (tipoEsperado == Boolean.class
                    || tipoEsperado == boolean.class) {
                String texto = valor.toString();

                if (!texto.equalsIgnoreCase("true")
                        && !texto.equalsIgnoreCase("false")) {
                    throw new IllegalArgumentException(
                        "Debe ser true o false."
                    );
                }

                return Boolean.valueOf(texto);
            }

            if (tipoEsperado == Short.class
                    || tipoEsperado == short.class) {
                return Short.valueOf(valor.toString());
            }

            if (tipoEsperado == Byte.class
                    || tipoEsperado == byte.class) {
                return Byte.valueOf(valor.toString());
            }

            throw new IllegalArgumentException(
                "Tipo no compatible todavía: "
                + tipoEsperado.getName()
            );

        } catch (RuntimeException e) {
            throw new IOException(
                "Valor inválido para el parámetro "
                + nombreParametro + ". Tipo esperado: "
                + tipoEsperado.getName()
                + ". Valor recibido: " + valor,
                e
            );
        }
    }
}


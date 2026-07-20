import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Documentación de API - Empresa de Transportes El Cumbe",
  description: "Especificación OpenAPI 3.0 y Swagger UI interactivo de los servicios RESTful y API Móvil.",
};

export default function ApiDocsPage() {
  const swaggerHtml = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>Documentación API - El Cumbe</title>
      <link rel="stylesheet" type="text/css" href="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.18.3/swagger-ui.css" />
      <style>
        html { box-sizing: border-box; overflow: -moz-scrollbars-vertical; overflow-y: scroll; }
        *, *:before, *:after { box-sizing: inherit; }
        body { margin:0; background: #fafafa; }
        .swagger-ui .topbar { background-color: #0f172a; }
        .swagger-ui .topbar-wrapper img { content: url('/images/logo.png'); height: 40px; }
      </style>
    </head>
    <body>
      <div id="swagger-ui"></div>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.18.3/swagger-ui-bundle.js"></script>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.18.3/swagger-ui-standalone-preset.js"></script>
      <script>
        window.onload = function() {
          const ui = SwaggerUIBundle({
            url: "/openapi.json",
            dom_id: '#swagger-ui',
            deepLinking: true,
            presets: [
              SwaggerUIBundle.presets.apis,
              SwaggerUIStandalonePreset
            ],
            plugins: [
              SwaggerUIBundle.plugins.DownloadUrl
            ],
            layout: "StandaloneLayout"
          });
          window.ui = ui;
        };
      </script>
    </body>
    </html>
  `;

  return (
    <iframe
      srcDoc={swaggerHtml}
      style={{
        width: "100%",
        height: "100vh",
        border: "none",
        display: "block"
      }}
      title="Documentación de API OpenAPI / Swagger - El Cumbe"
    />
  );
}

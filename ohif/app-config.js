/**
 * OHIF Viewer — Configuración para Garvis
 *
 * Los endpoints /dicom-web y /wado son relativos a este servidor (port 3000).
 * El nginx.conf de este contenedor proxea esas rutas hacia Orthanc.
 * De esta forma OHIF no tiene problema de CORS.
 */
window.config = {
  routerBasename: "/",
  showStudyList: false,
  defaultDataSourceName: "dicomweb",

  // Requerido por OHIF v3 — dejar vacíos para usar los defaults
  extensions: [],
  modes: [],

  dataSources: [
    {
      namespace: "@ohif/extension-default.dataSourcesModule.dicomweb",
      sourceName: "dicomweb",
      configuration: {
        friendlyName: "Garvis PACS",
        name: "Orthanc",

        // Rutas relativas → el nginx proxy hace el resto
        wadoUriRoot: "/wado",
        qidoRoot: "/dicom-web",
        wadoRoot: "/dicom-web",

        qidoSupportsIncludeField: true,
        imageRendering: "wadors",
        thumbnailRendering: "wadors",

        enableStudyLazyLoad: true,
        supportsFuzzyMatching: true,
        supportsWildcard: true,
        dicomUploadEnabled: false,
        omitQuotationForMultipartRequest: true,
      },
    },
  ],

  hotkeys: [],
};

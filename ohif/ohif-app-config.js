/**
 * OHIF Viewer — Configuración PRODUCCIÓN para Garvis
 *
 * El gateway Nginx (dicom-gateway) proxea:
 *   /dicom-web/ → orthanc:8042/dicom-web/
 *   /wado       → orthanc:8042/wado
 *
 * Por eso los paths son relativos al mismo origen (ohif.garbis.online).
 */
window.config = {
  routerBasename: "/",
  showStudyList: false,
  defaultDataSourceName: "dicomweb",

  extensions: [],
  modes: [],

  dataSources: [
    {
      namespace: "@ohif/extension-default.dataSourcesModule.dicomweb",
      sourceName: "dicomweb",
      configuration: {
        friendlyName: "Garvis PACS",
        name: "Orthanc",

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

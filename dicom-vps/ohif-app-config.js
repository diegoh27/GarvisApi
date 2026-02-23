/**
 * OHIF Viewer — Garvis VPS
 * Rutas relativas: el gateway nginx proxea /dicom-web a Orthanc
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
        friendlyName: "Orthanc DICOMweb",
        name: "dicomweb",

        qidoRoot: "/dicom-web",
        wadoRoot: "/dicom-web",
        wadoUriRoot: "/dicom-web",

        qidoSupportsIncludeField: true,
        imageRendering: "wadors",
        thumbnailRendering: "wadors",
        enableStudyLazyLoad: false,
        supportsFuzzyMatching: false,
        supportsWildcard: false,
        dicomUploadEnabled: false
      }
    }
  ],

  hotkeys: []
};

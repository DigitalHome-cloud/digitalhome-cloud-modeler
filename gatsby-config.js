module.exports = {
  siteMetadata: {
    title: `DHC Modeler`,
    siteUrl: `https://modeler.digitalhome.cloud`,
    description: `3D ontology viewer for the DigitalHome.Cloud platform.`,
    author: `D-LAB-5`
  },
  plugins: [
    // Keep your existing Gatsby plugins here (image, sharp, etc.) when merging.

    {
      resolve: `gatsby-source-filesystem`,
      options: {
        name: `locales`,
        path: `${__dirname}/src/locales`,
      },
    },
    {
      resolve: `gatsby-plugin-react-i18next`,
      options: {
        localeJsonSourceName: `locales`,
        languages: [`en`, `de`, `fr`],
        defaultLanguage: `en`,
        siteUrl: `https://modeler.digitalhome.cloud`,
        i18nextOptions: {
          fallbackLng: `en`,
          interpolation: {
            escapeValue: false,
          },
        },
      },
    },
  ],
};

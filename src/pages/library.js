import * as React from "react";
import Layout from "../components/Layout";
import LibraryList from "../components/LibraryList";
import { useTranslation } from "gatsby-plugin-react-i18next";
import { graphql } from "gatsby";

const LibraryPage = () => {
  const { t } = useTranslation();

  return (
    <Layout>
      <main className="dhc-main">
        <h1>{t("library.title")}</h1>
        <p style={{ color: "#94a3b8", marginBottom: "1.5rem" }}>
          {t("library.desc")}
        </p>
        <LibraryList />
      </main>
    </Layout>
  );
};

export default LibraryPage;

export const query = graphql`
  query LibraryPageQuery($language: String!) {
    locales: allLocale(filter: { language: { eq: $language } }) {
      edges {
        node {
          ns
          data
          language
        }
      }
    }
  }
`;

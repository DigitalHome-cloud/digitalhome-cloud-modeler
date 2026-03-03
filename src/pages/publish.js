import * as React from "react";
import Layout from "../components/Layout";
import OntologyPublisher from "../components/OntologyPublisher";
import { useTranslation } from "gatsby-plugin-react-i18next";
import { graphql } from "gatsby";

const PublishPage = () => {
  const { t } = useTranslation();

  return (
    <Layout>
      <main className="dhc-main">
        <h1>{t("publish.title")}</h1>
        <p style={{ color: "#94a3b8", marginBottom: "1.5rem" }}>
          {t("publish.desc")}
        </p>
        <OntologyPublisher />
      </main>
    </Layout>
  );
};

export default PublishPage;

export const query = graphql`
  query PublishPageQuery($language: String!) {
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

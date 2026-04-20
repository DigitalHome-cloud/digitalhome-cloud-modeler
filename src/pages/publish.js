import React, { useEffect } from "react";
import Layout from "../components/Layout";
import OntologyPublisher from "../components/OntologyPublisher";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "gatsby-plugin-react-i18next";
import { graphql, navigate } from "gatsby";

const PublishPage = () => {
  const { t } = useTranslation();
  const { authState, isAuthenticated, hasGroup } = useAuth();

  const canAccess = hasGroup("dhc-modelers") || hasGroup("dhc-admins");

  useEffect(() => {
    if (authState === "loading") return;
    if (!isAuthenticated) {
      navigate("/signin/");
    }
  }, [authState, isAuthenticated]);

  if (!isAuthenticated) return null;

  if (!canAccess) {
    return (
      <Layout>
        <main className="dhc-main">
          <h1>{t("publish.title")}</h1>
          <p className="dhc-error-message">{t("config.noAccess")}</p>
        </main>
      </Layout>
    );
  }

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

import React, { useEffect } from "react";
import { graphql, navigate } from "gatsby";
import Layout from "../components/Layout";
import WorkspaceShell from "../components/WorkspaceShell";
import { useAuth } from "../context/AuthContext";

const IndexPage = () => {
  const { authState, isAuthenticated } = useAuth();

  useEffect(() => {
    if (authState === "loading") return;
    if (!isAuthenticated) {
      navigate("/signin/");
    }
  }, [authState, isAuthenticated]);

  if (!isAuthenticated) return null;

  return (
    <Layout>
      <main className="dhc-main dhc-main--full">
        <WorkspaceShell />
      </main>
    </Layout>
  );
};

export default IndexPage;

export const query = graphql`
  query IndexPageQuery($language: String!) {
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

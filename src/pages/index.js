import * as React from "react";
import { graphql } from "gatsby";
import Layout from "../components/Layout";
import WorkspaceShell from "../components/WorkspaceShell";

const IndexPage = () => {
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

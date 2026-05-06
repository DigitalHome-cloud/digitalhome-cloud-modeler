import * as React from "react";
import { graphql, navigate } from "gatsby";
import SignInBackground from "../components/SignInBackground";
import SignInHeader from "../components/SignInHeader";
import SignInCard from "../components/SignInCard";
import { useAuth } from "../context/AuthContext";
import "../styles/signin.css";

const SignInPage = () => {
  const { isAuthenticated } = useAuth();

  React.useEffect(() => {
    if (isAuthenticated) {
      navigate("/");
    }
  }, [isAuthenticated]);

  return (
    <div className="dhc-signin-shell">
      <SignInBackground />
      <div className="dhc-signin-stage">
        <SignInHeader />
        <main className="dhc-signin-main">
          <SignInCard />
        </main>
      </div>
    </div>
  );
};

export default SignInPage;

export const query = graphql`
  query SignInPageQuery($language: String!) {
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

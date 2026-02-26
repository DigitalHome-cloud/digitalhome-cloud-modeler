import React from "react";
import { Amplify } from "aws-amplify";
import awsExports from "./src/aws-exports.deployment";
import { AuthProvider } from "./src/context/AuthContext";

Amplify.configure(awsExports);

export const wrapRootElement = ({ element }) => (
  <AuthProvider>{element}</AuthProvider>
);

export const onRenderBody = ({ setHtmlAttributes }) => {
  setHtmlAttributes({ lang: "en" });
};

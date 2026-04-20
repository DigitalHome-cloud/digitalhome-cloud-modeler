import "./src/styles/global.css";
import React from "react";
import { Amplify } from "aws-amplify";
import awsExports from "./src/aws-exports.deployment";
import { AuthProvider } from "./src/context/AuthContext";
import { OntologyProvider } from "./src/context/OntologyContext";

Amplify.configure(awsExports);

export const wrapRootElement = ({ element }) => (
  <AuthProvider>
    <OntologyProvider>{element}</OntologyProvider>
  </AuthProvider>
);

import "./src/styles/dhc-tokens.css";
import "./src/styles/global.css";
import React from "react";
import { Amplify } from "aws-amplify";
import outputs from "./src/amplify_outputs.json";
import { AuthProvider } from "./src/context/AuthContext";
import { OntologyProvider } from "./src/context/OntologyContext";

Amplify.configure(outputs);

export const wrapRootElement = ({ element }) => (
  <AuthProvider>
    <OntologyProvider>{element}</OntologyProvider>
  </AuthProvider>
);

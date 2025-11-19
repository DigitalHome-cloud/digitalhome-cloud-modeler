// Theme for DigitalHome.Cloud Ontology Designer blocks.
// Uses a cool dark blue base with white text and different border/secondary colours
// per ontology element type.

import * as Blockly from "blockly";

export const DhcOntologyTheme = Blockly.Theme.defineTheme("dhcOntologyTheme", {
  base: Blockly.Themes.Classic,
  blockStyles: {
    // Root container (owl:Thing)
    ontology_root_style: {
      colourPrimary: "#0f172a",
      colourSecondary: "#1e293b",
      colourTertiary: "#64748b",
    },
    // Classes
    ontology_class_style: {
      colourPrimary: "#0f172a",
      colourSecondary: "#1d4ed8",
      colourTertiary: "#1e293b",
    },
    // Object properties
    ontology_object_property_style: {
      colourPrimary: "#0f172a",
      colourSecondary: "#0f766e",
      colourTertiary: "#1e293b",
    },
    // Data properties
    ontology_data_property_style: {
      colourPrimary: "#0f172a",
      colourSecondary: "#7c3aed",
      colourTertiary: "#1e293b",
    },
    // Individuals
    ontology_individual_style: {
      colourPrimary: "#0f172a",
      colourSecondary: "#0369a1",
      colourTertiary: "#1e293b",
    },
    // Annotations
    ontology_annotation_style: {
      colourPrimary: "#0f172a",
      colourSecondary: "#4b5563",
      colourTertiary: "#1e293b",
    },
  },
  componentStyles: {
    workspaceBackgroundColour: "#020617",
    toolboxBackgroundColour: "#020617",
    toolboxForegroundColour: "#e5e7eb",
    flyoutBackgroundColour: "#020617",
    flyoutForegroundColour: "#e5e7eb",
    flyoutOpacity: 0.9,
    scrollbarColour: "#1e293b",
  },
  fontStyle: {
    family:
      "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    weight: "bold",
    size: 12,
  },
});

// Example usage when creating a workspace:
// const workspace = Blockly.inject("blocklyDiv", {
//   toolbox,
//   theme: DhcOntologyTheme,
// });

// src/blockly/toolbox.js
export const dhcToolbox = {
  kind: "categoryToolbox",
  contents: [
    {
      kind: "category",
      name: "Classes",
      colour: "210",
      contents: [
        { kind: "block", type: "dhc_class" },
        { kind: "block", type: "dhc_equipment_type" },
      ],
    },
    {
      kind: "category",
      name: "Object properties",
      colour: "160",
      contents: [{ kind: "block", type: "dhc_object_property" }],
    },
    {
      kind: "category",
      name: "Data properties",
      colour: "140",
      contents: [{ kind: "block", type: "dhc_data_property" }],
    },
  ],
};

/**
 * Returns toolbox XML for the DHC Modeler workspace.
 */
export const getToolboxXml = () => `
<xml xmlns="https://developers.google.com/blockly/xml" id="dhc-toolbox" style="display: none">
  <category name="Classes" colour="210">
    <block type="dhc_class"></block>
    <block type="dhc_equipment_type"></block>
  </category>
  <category name="Object properties" colour="160">
    <block type="dhc_object_property"></block>
  </category>
  <category name="Data properties" colour="140">
    <block type="dhc_data_property"></block>
  </category>
</xml>
`;

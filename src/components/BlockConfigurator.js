import React from "react";
import { useTranslation } from "gatsby-plugin-react-i18next";

const BlockConfigurator = ({ block, readOnly }) => {
  const { t } = useTranslation();

  if (!block) {
    return (
      <div className="dhc-configurator-empty">
        <p>{t("builder.selectBlock")}</p>
      </div>
    );
  }

  const fields = (block.args0 || []);
  const statements = [];
  const values = [];
  let i = 1;
  while (block[`args${i}`]) {
    const arg = block[`args${i}`][0];
    if (arg.type === "input_statement") statements.push(arg);
    if (arg.type === "input_value") values.push(arg);
    i++;
  }

  return (
    <div className="dhc-configurator">
      <table className="dhc-table dhc-table--compact">
        <tbody>
          <tr>
            <td>{t("builder.blockType")}</td>
            <td><code>{block.type}</code></td>
          </tr>
          <tr>
            <td>{t("builder.ontologyClass")}</td>
            <td>{block.ontologyClass}</td>
          </tr>
          <tr>
            <td>{t("builder.designView")}</td>
            <td>
              <span
                className="dhc-mapping-view-badge"
                style={{
                  backgroundColor: `hsl(${block.colour}, 60%, 45%)`,
                }}
              >
                {block.designView}
              </span>
            </td>
          </tr>
          <tr>
            <td>Colour</td>
            <td>{block.colour}</td>
          </tr>
          <tr>
            <td>Tooltip</td>
            <td>{block.tooltip}</td>
          </tr>
        </tbody>
      </table>

      <h4>{t("builder.fields")} ({fields.length})</h4>
      <table className="dhc-table dhc-table--compact">
        <thead>
          <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Default</th>
          </tr>
        </thead>
        <tbody>
          {fields.map((f) => (
            <tr key={f.name}>
              <td><code>{f.name}</code></td>
              <td>{f.type}</td>
              <td>
                {f.type === "field_input" && (f.text || "")}
                {f.type === "field_number" && (f.value ?? 0)}
                {f.type === "field_checkbox" && (f.checked ? "true" : "false")}
                {f.type === "field_dropdown" && (
                  <span>{(f.options || []).length} options</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {statements.length > 0 && (
        <>
          <h4>{t("builder.containment")} ({statements.length})</h4>
          <table className="dhc-table dhc-table--compact">
            <thead>
              <tr>
                <th>Name</th>
                <th>Check</th>
              </tr>
            </thead>
            <tbody>
              {statements.map((s) => (
                <tr key={s.name}>
                  <td><code>{s.name}</code></td>
                  <td>{s.check || "any"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {values.length > 0 && (
        <>
          <h4>{t("builder.references")} ({values.length})</h4>
          <table className="dhc-table dhc-table--compact">
            <thead>
              <tr>
                <th>Name</th>
                <th>Check</th>
              </tr>
            </thead>
            <tbody>
              {values.map((v) => (
                <tr key={v.name}>
                  <td><code>{v.name}</code></td>
                  <td>{v.check || "any"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
};

export default BlockConfigurator;

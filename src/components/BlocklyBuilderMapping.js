import React, { useMemo } from "react";
import { VIEW_COLOURS } from "../utils/blocklyGenerator";

const hueToHsl = (hue) => `hsl(${hue}, 60%, 45%)`;

const BlocklyBuilderMapping = ({ blocks, selectedBlock, onSelectBlock }) => {
  const grouped = useMemo(() => {
    const groups = {};
    for (const block of blocks) {
      const view = block.designView || "shared";
      if (!groups[view]) groups[view] = [];
      groups[view].push(block);
    }
    return groups;
  }, [blocks]);

  const viewOrder = [
    "spatial",
    "electrical",
    "shared",
    "building",
    "plumbing",
    "heating",
    "network",
    "governance",
    "automation",
  ];

  const sortedViews = viewOrder.filter((v) => grouped[v]);

  return (
    <div className="dhc-mapping-table">
      {sortedViews.map((view) => (
        <div key={view} className="dhc-mapping-group">
          <div
            className="dhc-mapping-group-header"
            style={{
              borderLeftColor: hueToHsl(VIEW_COLOURS[view] || 0),
            }}
          >
            <span className="dhc-mapping-view-badge" style={{
              backgroundColor: hueToHsl(VIEW_COLOURS[view] || 0),
            }}>
              {view}
            </span>
            <span className="dhc-mapping-count">
              {grouped[view].length}
            </span>
          </div>

          {grouped[view].map((block) => {
            const isSelected =
              selectedBlock && selectedBlock.type === block.type;
            const fields = (block.args0 || []).filter(
              (a) => a.name !== "LABEL"
            );
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
              <div
                key={block.type}
                className={`dhc-mapping-row ${isSelected ? "dhc-mapping-row--selected" : ""}`}
                onClick={() => onSelectBlock(block)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") onSelectBlock(block);
                }}
              >
                <div className="dhc-mapping-row-main">
                  <span
                    className="dhc-mapping-dot"
                    style={{
                      backgroundColor: hueToHsl(block.colour),
                    }}
                  />
                  <span className="dhc-mapping-class">
                    {block.ontologyClass}
                  </span>
                  <span className="dhc-mapping-arrow">&rarr;</span>
                  <code className="dhc-mapping-type">{block.type}</code>
                </div>
                <div className="dhc-mapping-row-detail">
                  {fields.length > 0 && (
                    <span className="dhc-mapping-detail-item">
                      {fields.length} fields
                    </span>
                  )}
                  {statements.length > 0 && (
                    <span className="dhc-mapping-detail-item">
                      {statements.length} containment
                    </span>
                  )}
                  {values.length > 0 && (
                    <span className="dhc-mapping-detail-item">
                      {values.length} ref
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};

export default BlocklyBuilderMapping;

import type { StandardsFramework } from "@/lib/standards";

export function StandardsPicker({
  framework,
  selected = [],
  showMandate = true,
}: {
  framework: StandardsFramework;
  selected?: string[];
  showMandate?: boolean;
}) {
  const chosen = new Set(selected);
  return (
    <div className="field">
      <label>{framework.fieldLabel}</label>
      <div className="std-options">
        {framework.items.map((item) => (
          <label className="std-option" key={item.code}>
            <input
              type={framework.multiple ? "checkbox" : "radio"}
              name="standards"
              value={item.code}
              defaultChecked={chosen.has(item.code)}
            />
            <span className="std-option__code">{item.code}</span>
            <span className="std-option__title">{item.title}</span>
          </label>
        ))}
      </div>
      {showMandate && (
        <div className="hint">
          {framework.multiple && "Tick every standard the activity helps you meet. "}
          {framework.mandate}{" "}
          <a href={framework.sourceUrl} target="_blank" rel="noreferrer">
            Read the requirements
          </a>
          .
        </div>
      )}
    </div>
  );
}

export function StandardsBadges({
  framework,
  codes,
}: {
  framework: StandardsFramework;
  codes: string[];
}) {
  if (codes.length === 0) {
    return <span className="badge badge--neutral">Not yet tagged</span>;
  }
  return (
    <span className="std-badges">
      {codes.map((code) => {
        const item = framework.items.find((i) => i.code === code);
        return (
          <span className="badge badge--official" key={code} title={item?.title}>
            {code}
          </span>
        );
      })}
    </span>
  );
}

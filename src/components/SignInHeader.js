import * as React from "react";
import { useI18next } from "gatsby-plugin-react-i18next";
import { getAppUrl } from "../utils/getAppUrl";

const NAMESPACES = [
  ["brick", "#f59e0b"],
  ["rec", "#3b82f6"],
  ["s223", "#a855f7"],
  ["dhc", "#22c55e"],
];

const LANGUAGES = ["en", "de", "fr"];

const SignInHeader = () => {
  const { language, changeLanguage } = useI18next();

  // Defer environment-dependent URL until after hydration so SSR and the
  // initial client render agree (avoids React hydration warnings on dev/stage,
  // where getAppUrl() returns different values on the server vs the browser).
  const [portalUrl, setPortalUrl] = React.useState("https://portal.digitalhome.cloud");
  React.useEffect(() => {
    setPortalUrl(getAppUrl("portal"));
  }, []);
  const portalHost = portalUrl.replace(/^https?:\/\//, "");

  return (
    <header className="dhc-signin-header">
      <img
        src="/dlab5-mark.svg"
        width={26}
        height={26}
        alt="DLAB5"
        className="dhc-signin-header-mark"
      />
      <div className="dhc-signin-wordmark">
        <span className="dhc-signin-wordmark-product">DigitalHome.Cloud</span>
        <span className="dhc-signin-wordmark-sep">/</span>
        <span className="dhc-signin-wordmark-app">Modeler</span>
      </div>

      <div className="dhc-signin-ns-pills">
        {NAMESPACES.map(([k, c]) => (
          <span
            key={k}
            className="dhc-signin-ns-pill"
            style={{
              color: c,
              border: `1px solid ${c}33`,
            }}
          >
            {k}:
          </span>
        ))}
      </div>

      <div className="dhc-signin-lang-group">
        {LANGUAGES.map((l) => (
          <button
            key={l}
            type="button"
            className={`lang-btn${language === l ? " active" : ""}`}
            onClick={() => changeLanguage(l)}
          >
            {l.toUpperCase()}
          </button>
        ))}
      </div>

      <a href={portalUrl} className="dhc-signin-portal-link">
        {portalHost}
      </a>
    </header>
  );
};

export default SignInHeader;

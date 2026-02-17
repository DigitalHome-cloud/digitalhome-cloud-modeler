import * as React from "react";
import { Link } from "gatsby";
import { useTranslation } from "gatsby-plugin-react-i18next";

const portalUrl =
  process.env.GATSBY_PORTAL_URL || "https://portal.digitalhome.cloud";
const designerUrl =
  process.env.GATSBY_DESIGNER_URL || "https://designer.digitalhome.cloud";

const Header = () => {
  const { t } = useTranslation();

  return (
    <header className="dhc-header">
      <div className="dhc-header-inner">
        <div className="dhc-logo">
          <span className="dhc-logo-mark">DH</span>
          <div className="dhc-logo-text">
            <span className="dhc-logo-title">DigitalHome.Cloud</span>
            <span className="dhc-logo-subtitle">Modeler</span>
          </div>
        </div>

        <nav className="dhc-nav">
          <div className="dhc-nav-group">
            <Link to="/" className="dhc-nav-link">
              {t("nav.home")}
            </Link>
            <a href={portalUrl} className="dhc-nav-link">
              {t("nav.portal")}
            </a>
            <a href={designerUrl} className="dhc-nav-link">
              {t("nav.designer")}
            </a>
            <a
              href="https://github.com/DigitalHome-cloud"
              className="dhc-nav-link"
              target="_blank"
              rel="noreferrer"
            >
              {t("nav.github")}
            </a>
          </div>
        </nav>
      </div>
    </header>
  );
};

export default Header;

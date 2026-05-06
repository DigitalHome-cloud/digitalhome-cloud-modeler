import * as React from "react";
import { navigate } from "gatsby";
import { useTranslation } from "gatsby-plugin-react-i18next";
import {
  signIn,
  confirmSignIn,
  resetPassword,
  confirmResetPassword,
  confirmSignUp,
  resendSignUpCode,
} from "aws-amplify/auth";
import { useAuth } from "../context/AuthContext";

const ACCENT = "#22c55e";

const ONT_DOTS = [
  ["brick", "#f59e0b"],
  ["rec", "#3b82f6"],
  ["s223", "#a855f7"],
  ["dhc", "#22c55e"],
];

const Cursor = ({ color = ACCENT }) => {
  const [on, setOn] = React.useState(true);
  React.useEffect(() => {
    const id = setInterval(() => setOn((v) => !v), 530);
    return () => clearInterval(id);
  }, []);
  return <span style={{ color, opacity: on ? 0.9 : 0 }}>▋</span>;
};

const friendlyError = (err, t) => {
  if (!err) return "";
  // Amplify v6 errors expose `name` and `message`.
  const name = err.name || err.code || "";
  switch (name) {
    case "NotAuthorizedException":
      return "invalid credentials";
    case "UserNotConfirmedException":
      return "identifier not verified · check inbox";
    case "PasswordResetRequiredException":
      return "password reset required";
    case "UserNotFoundException":
      return "no such identifier";
    case "CodeMismatchException":
      return "code mismatch";
    case "ExpiredCodeException":
      return "code expired";
    case "LimitExceededException":
      return "rate limited · try again later";
    case "InvalidPasswordException":
      return err.message || "password does not meet policy";
    case "InvalidParameterException":
      return err.message || "invalid input";
    default:
      return err.message || "authentication failed";
  }
};

const SignInCard = () => {
  const { t } = useTranslation();
  const { reloadSession } = useAuth();

  const [mode, setMode] = React.useState("signIn");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [pwVisible, setPwVisible] = React.useState(false);
  const [code, setCode] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [notice, setNotice] = React.useState("");

  // Cache the password used for sign-in so we can transparently re-sign-in
  // after a successful confirmSignUp without prompting again.
  const cachedPasswordRef = React.useRef("");

  const resetSubFormState = () => {
    setCode("");
    setNewPassword("");
    setError("");
    setNotice("");
  };

  const goBack = () => {
    resetSubFormState();
    setMode("signIn");
  };

  const handleSuccess = async () => {
    setMode("done");
    try {
      await reloadSession();
    } catch (e) {
      // reloadSession is best-effort; the AuthProvider also reloads on mount.
    }
    navigate("/");
  };

  const branchOnNextStep = (nextStep) => {
    if (!nextStep) {
      handleSuccess();
      return;
    }
    switch (nextStep.signInStep) {
      case "DONE":
        handleSuccess();
        break;
      case "CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED":
        resetSubFormState();
        setMode("newPasswordRequired");
        break;
      case "CONFIRM_SIGN_IN_WITH_TOTP_CODE":
        resetSubFormState();
        setMode("mfaTotp");
        break;
      case "CONFIRM_SIGN_IN_WITH_SMS_CODE":
        resetSubFormState();
        setMode("mfaSms");
        break;
      case "CONTINUE_SIGN_IN_WITH_TOTP_SETUP":
      case "CONTINUE_SIGN_IN_WITH_MFA_SELECTION":
        setError("mfa setup required · use the legacy flow");
        break;
      case "CONFIRM_SIGN_UP":
        (async () => {
          try {
            await resendSignUpCode({ username: email });
          } catch (e) {
            // ignore — user can still enter a previously sent code
          }
        })();
        resetSubFormState();
        setMode("confirmEmail");
        break;
      case "RESET_PASSWORD":
        (async () => {
          try {
            await resetPassword({ username: email });
            resetSubFormState();
            setMode("forgotPasswordConfirm");
          } catch (e) {
            setError(friendlyError(e, t));
          }
        })();
        break;
      default:
        setError(`unsupported step · ${nextStep.signInStep || "unknown"}`);
    }
  };

  const handleSignIn = async () => {
    if (!email || !password) {
      setError(t("signin.error.credentialsRequired"));
      return;
    }
    setError("");
    setNotice("");
    setLoading(true);
    cachedPasswordRef.current = password;
    try {
      const result = await signIn({ username: email, password });
      if (result.isSignedIn) {
        await handleSuccess();
      } else {
        branchOnNextStep(result.nextStep);
      }
    } catch (err) {
      setError(friendlyError(err, t));
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmNewPassword = async () => {
    if (!newPassword) {
      setError(t("signin.error.credentialsRequired"));
      return;
    }
    setError("");
    setLoading(true);
    try {
      const result = await confirmSignIn({ challengeResponse: newPassword });
      if (result.isSignedIn) {
        await handleSuccess();
      } else {
        branchOnNextStep(result.nextStep);
      }
    } catch (err) {
      setError(friendlyError(err, t));
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmMfa = async () => {
    if (!code) {
      setError(t("signin.error.credentialsRequired"));
      return;
    }
    setError("");
    setLoading(true);
    try {
      const result = await confirmSignIn({ challengeResponse: code });
      if (result.isSignedIn) {
        await handleSuccess();
      } else {
        branchOnNextStep(result.nextStep);
      }
    } catch (err) {
      setError(friendlyError(err, t));
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmEmail = async () => {
    if (!code) {
      setError(t("signin.error.credentialsRequired"));
      return;
    }
    setError("");
    setLoading(true);
    try {
      await confirmSignUp({ username: email, confirmationCode: code });
      // After confirming, sign in transparently with the cached password.
      const cached = cachedPasswordRef.current;
      if (cached) {
        const result = await signIn({ username: email, password: cached });
        if (result.isSignedIn) {
          await handleSuccess();
          return;
        }
        branchOnNextStep(result.nextStep);
        return;
      }
      // No cached password — fall back to the sign-in form with a notice.
      resetSubFormState();
      setMode("signIn");
      setNotice("identifier verified · sign in to continue");
    } catch (err) {
      setError(friendlyError(err, t));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotRequest = async () => {
    if (!email) {
      setError(t("signin.error.credentialsRequired"));
      return;
    }
    setError("");
    setLoading(true);
    try {
      await resetPassword({ username: email });
      resetSubFormState();
      setMode("forgotPasswordConfirm");
    } catch (err) {
      setError(friendlyError(err, t));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotConfirm = async () => {
    if (!code || !newPassword) {
      setError(t("signin.error.credentialsRequired"));
      return;
    }
    setError("");
    setLoading(true);
    try {
      await confirmResetPassword({
        username: email,
        confirmationCode: code,
        newPassword,
      });
      resetSubFormState();
      setMode("signIn");
      setNotice("password reset · sign in with new credentials");
      setPassword("");
    } catch (err) {
      setError(friendlyError(err, t));
    } finally {
      setLoading(false);
    }
  };

  const onEnter = (handler) => (e) => {
    if (e.key === "Enter") handler();
  };

  const ButtonExecute = ({ idleLabel, busyLabel, onClick }) => (
    <button
      type="button"
      className="btn-signin"
      onClick={onClick}
      disabled={loading}
      style={{ borderColor: `${ACCENT}66`, color: ACCENT, marginTop: "0.2rem" }}
    >
      {loading ? (
        <span>
          <span style={{ opacity: 0.5 }}>{busyLabel}</span>
          <span> </span>
          <Cursor color={ACCENT} />
        </span>
      ) : (
        <span>
          <span style={{ opacity: 0.4 }}>$ </span>
          {idleLabel}
          <Cursor color={ACCENT} />
        </span>
      )}
    </button>
  );

  // ── form bodies per mode ──────────────────────────────────────────────

  const renderSignIn = () => (
    <>
      {/* Email */}
      <div className="dhc-signin-field-row">
        <div className="f-label">
          <span className="dhc-signin-field-arrow">→</span>
          {t("signin.identifier")}
        </div>
        <input
          className="f-input"
          type="email"
          autoComplete="username"
          placeholder="user@dlab5.io"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setError("");
          }}
        />
      </div>

      {/* Password */}
      <div className="dhc-signin-field-row">
        <div className="f-label">
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span className="dhc-signin-field-arrow">→</span>
            {t("signin.secret")}
          </span>
          <button
            type="button"
            className="dhc-signin-forgot-link"
            onClick={() => {
              resetSubFormState();
              setMode("forgotPasswordRequest");
            }}
          >
            {t("signin.forgot")}
          </button>
        </div>
        <div className="dhc-signin-pw-wrap">
          <input
            className="f-input"
            type={pwVisible ? "text" : "password"}
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError("");
            }}
            onKeyDown={onEnter(handleSignIn)}
            style={{ paddingRight: "2.5rem" }}
          />
          <button
            type="button"
            className="dhc-signin-pw-toggle"
            onClick={() => setPwVisible((v) => !v)}
            aria-label="toggle password visibility"
          >
            {pwVisible ? "○" : "●"}
          </button>
        </div>
      </div>

      {error && <div className="dhc-signin-error">✗ {error}</div>}
      {notice && !error && <div className="dhc-signin-notice">✓ {notice}</div>}

      <ButtonExecute
        idleLabel={t("signin.execute")}
        busyLabel={t("signin.authenticating")}
        onClick={handleSignIn}
      />
    </>
  );

  const renderNewPassword = () => (
    <>
      <button type="button" className="dhc-signin-back-link" onClick={goBack}>
        {t("signin.back")}
      </button>

      <div className="dhc-signin-field-row">
        <div className="f-label">
          <span className="dhc-signin-field-arrow">→</span>
          {t("signin.newPassword.title")}
        </div>
        <input
          className="f-input"
          type="password"
          autoComplete="new-password"
          placeholder={t("signin.newPassword.placeholder")}
          value={newPassword}
          onChange={(e) => {
            setNewPassword(e.target.value);
            setError("");
          }}
          onKeyDown={onEnter(handleConfirmNewPassword)}
        />
      </div>

      {error && <div className="dhc-signin-error">✗ {error}</div>}

      <ButtonExecute
        idleLabel={t("signin.newPassword.confirm")}
        busyLabel={t("signin.authenticating")}
        onClick={handleConfirmNewPassword}
      />
    </>
  );

  const renderMfa = (titleKey) => (
    <>
      <button type="button" className="dhc-signin-back-link" onClick={goBack}>
        {t("signin.back")}
      </button>

      <div className="dhc-signin-field-row">
        <div className="f-label">
          <span className="dhc-signin-field-arrow">→</span>
          {t(titleKey)}
        </div>
        <input
          className="f-input"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder={t("signin.mfa.placeholder")}
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            setError("");
          }}
          onKeyDown={onEnter(handleConfirmMfa)}
        />
      </div>

      {error && <div className="dhc-signin-error">✗ {error}</div>}

      <ButtonExecute
        idleLabel={t("signin.mfa.confirm")}
        busyLabel={t("signin.authenticating")}
        onClick={handleConfirmMfa}
      />
    </>
  );

  const renderConfirmEmail = () => (
    <>
      <button type="button" className="dhc-signin-back-link" onClick={goBack}>
        {t("signin.back")}
      </button>

      <div className="dhc-signin-field-row">
        <div className="f-label">
          <span className="dhc-signin-field-arrow">→</span>
          {t("signin.confirmEmail.title")}
        </div>
        <div className="dhc-signin-helper">{t("signin.confirmEmail.desc")}</div>
        <input
          className="f-input"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder={t("signin.confirmEmail.placeholder")}
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            setError("");
          }}
          onKeyDown={onEnter(handleConfirmEmail)}
          style={{ marginTop: "0.5rem" }}
        />
      </div>

      {error && <div className="dhc-signin-error">✗ {error}</div>}

      <ButtonExecute
        idleLabel={t("signin.confirmEmail.confirm")}
        busyLabel={t("signin.authenticating")}
        onClick={handleConfirmEmail}
      />
    </>
  );

  const renderForgotRequest = () => (
    <>
      <button type="button" className="dhc-signin-back-link" onClick={goBack}>
        {t("signin.back")}
      </button>

      <div className="dhc-signin-field-row">
        <div className="f-label">
          <span className="dhc-signin-field-arrow">→</span>
          {t("signin.recover.title")}
        </div>
        <div className="dhc-signin-helper">{t("signin.recover.desc")}</div>
        <input
          className="f-input"
          type="email"
          autoComplete="username"
          placeholder="user@dlab5.io"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setError("");
          }}
          onKeyDown={onEnter(handleForgotRequest)}
          style={{ marginTop: "0.5rem" }}
        />
      </div>

      {error && <div className="dhc-signin-error">✗ {error}</div>}

      <ButtonExecute
        idleLabel={t("signin.recover.send")}
        busyLabel={t("signin.authenticating")}
        onClick={handleForgotRequest}
      />
    </>
  );

  const renderForgotConfirm = () => (
    <>
      <button type="button" className="dhc-signin-back-link" onClick={goBack}>
        {t("signin.back")}
      </button>

      <div className="dhc-signin-field-row">
        <div className="f-label">
          <span className="dhc-signin-field-arrow">→</span>
          {t("signin.recover.code")}
        </div>
        <input
          className="f-input"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder={t("signin.confirmEmail.placeholder")}
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            setError("");
          }}
        />
      </div>

      <div className="dhc-signin-field-row">
        <div className="f-label">
          <span className="dhc-signin-field-arrow">→</span>
          {t("signin.recover.newSecret")}
        </div>
        <input
          className="f-input"
          type="password"
          autoComplete="new-password"
          placeholder={t("signin.newPassword.placeholder")}
          value={newPassword}
          onChange={(e) => {
            setNewPassword(e.target.value);
            setError("");
          }}
          onKeyDown={onEnter(handleForgotConfirm)}
        />
      </div>

      {error && <div className="dhc-signin-error">✗ {error}</div>}

      <ButtonExecute
        idleLabel={t("signin.recover.confirm")}
        busyLabel={t("signin.authenticating")}
        onClick={handleForgotConfirm}
      />
    </>
  );

  const renderDone = () => (
    <div className="dhc-signin-notice" style={{ marginTop: "0.4rem" }}>
      ✓ {t("signin.redirecting")} <Cursor color={ACCENT} />
    </div>
  );

  const body = (() => {
    switch (mode) {
      case "newPasswordRequired":
        return renderNewPassword();
      case "mfaTotp":
        return renderMfa("signin.mfa.totp.title");
      case "mfaSms":
        return renderMfa("signin.mfa.sms.title");
      case "confirmEmail":
        return renderConfirmEmail();
      case "forgotPasswordRequest":
        return renderForgotRequest();
      case "forgotPasswordConfirm":
        return renderForgotConfirm();
      case "done":
        return renderDone();
      case "signIn":
      default:
        return renderSignIn();
    }
  })();

  return (
    <div className="dhc-signin-card">
      <div className="dhc-signin-card-header">
        <div className="dhc-signin-card-header-row">
          <img src="/dlab5-mark.svg" width={28} height={28} alt="" />
          <div>
            <div className="dhc-signin-card-title">{t("signin.cardTitle")}</div>
            <div className="dhc-signin-card-subtitle">
              {t("signin.cardSubtitle")}
            </div>
          </div>
          <div className="dhc-signin-card-dots">
            {ONT_DOTS.map(([k, c]) => (
              <div
                key={k}
                className="dhc-signin-card-dot"
                style={{ background: c }}
              />
            ))}
          </div>
        </div>
        <div className="dhc-signin-card-bar">
          {ONT_DOTS.map(([k, c]) => (
            <div
              key={k}
              className="dhc-signin-card-bar-segment"
              style={{ background: c }}
            />
          ))}
        </div>
      </div>

      <div className="dhc-signin-card-body">{body}</div>

      <div className="dhc-signin-card-footer">
        <span className="dhc-signin-card-footer-text">
          modeler.digitalhome.cloud
        </span>
        <span className="dhc-signin-card-footer-text">
          {t("signin.tagline")}
        </span>
      </div>
    </div>
  );
};

export default SignInCard;

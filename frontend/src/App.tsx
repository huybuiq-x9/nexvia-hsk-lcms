import { FormEvent, startTransition, useState } from "react";
import { ApiError, AuthResponse, login } from "./api/auth";
import "./styles.css";

const STORAGE_KEY = "nexvia-lcms-auth";

type StoredAuth = AuthResponse & {
  savedAt: string;
};

const text = {
  appName: "Nexvia LCMS",
  eyebrow: "Learning Management Portal",
  title: "Sign in",
  subtitle: "Access the learning content management system with your account.",
  emailLabel: "Email",
  emailPlaceholder: "admin@nexvia.vn",
  passwordLabel: "Password",
  passwordPlaceholder: "Enter password",
  showPassword: "Show password",
  hidePassword: "Hide password",
  rememberSession: "Remember this session",
  submit: "Sign in",
  submitting: "Authenticating...",
  authenticated: "Authenticated",
  successTitle: (name: string) => `Hello, ${name}`,
  successCopy: "You are signed in to Nexvia LCMS with",
  tokenType: "Token type",
  accessExpires: "Access token lifetime",
  minutes: "minutes",
  sessionSaved: "Session saved at",
  logout: "Sign out from interface",
  errors: {
    missingFields: "Please enter your email and password.",
    invalidCredentials: "Email or password is incorrect.",
    network:
      "Cannot connect to the backend API. Check the FastAPI server and VITE_API_BASE_URL.",
    loginFailed: "Sign in failed. Please check your information.",
    badResponse: "Cannot read the server response.",
  },
} as const;

function readStoredAuth(): StoredAuth | null {
  const rawAuth =
    localStorage.getItem(STORAGE_KEY) ?? sessionStorage.getItem(STORAGE_KEY);

  if (!rawAuth) {
    return null;
  }

  try {
    return JSON.parse(rawAuth) as StoredAuth;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

function saveAuth(auth: AuthResponse, rememberSession: boolean): StoredAuth {
  const storedAuth = {
    ...auth,
    savedAt: new Date().toISOString(),
  };
  const targetStorage = rememberSession ? localStorage : sessionStorage;
  const staleStorage = rememberSession ? sessionStorage : localStorage;

  staleStorage.removeItem(STORAGE_KEY);
  targetStorage.setItem(STORAGE_KEY, JSON.stringify(storedAuth));

  return storedAuth;
}

function clearAuth() {
  localStorage.removeItem(STORAGE_KEY);
  sessionStorage.removeItem(STORAGE_KEY);
}

function resolveLoginError(loginError: unknown) {
  const errors = text.errors;

  if (loginError instanceof ApiError) {
    if (loginError.status === 0 || loginError.message === "NETWORK_ERROR") {
      return errors.network;
    }

    if (loginError.status === 401) {
      return errors.invalidCredentials;
    }

    if (loginError.message === "BAD_RESPONSE") {
      return errors.badResponse;
    }

    if (loginError.message === "LOGIN_FAILED") {
      return errors.loginFailed;
    }
  }

  return loginError instanceof Error ? loginError.message : errors.loginFailed;
}

function App() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberSession, setRememberSession] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [auth, setAuth] = useState<StoredAuth | null>(() => readStoredAuth());

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError(text.errors.missingFields);
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await login({
        email: email.trim(),
        password,
      });
      const storedAuth = saveAuth(result, rememberSession);

      startTransition(() => {
        setAuth(storedAuth);
        setPassword("");
      });
    } catch (loginError) {
      setError(resolveLoginError(loginError));
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleLogout() {
    clearAuth();
    setAuth(null);
  }

  if (auth) {
    return <AuthenticatedHome auth={auth} onLogout={handleLogout} />;
  }

  return (
    <main className="auth-page">
      <div className="login-shell">
        <header className="top-bar">
          <div className="brand-lockup">
            <div className="brand-mark">NX</div>
            <span>{text.appName}</span>
          </div>
        </header>

        <section className="login-card" aria-label={text.title}>
          <div className="card-heading">
            <p className="eyebrow">{text.eyebrow}</p>
            <p>{text.subtitle}</p>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            <label className="field">
              <span>{text.emailLabel}</span>
              <input
                autoComplete="email"
                inputMode="email"
                name="email"
                onChange={(event) => setEmail(event.target.value)}
                placeholder={text.emailPlaceholder}
                required
                type="email"
                value={email}
              />
            </label>

            <label className="field">
              <span>{text.passwordLabel}</span>
              <div className="password-control">
                <input
                  autoComplete="current-password"
                  name="password"
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder={text.passwordPlaceholder}
                  required
                  type={showPassword ? "text" : "password"}
                  value={password}
                />
                <button
                  aria-label={showPassword ? text.hidePassword : text.showPassword}
                  onClick={() => setShowPassword((current) => !current)}
                  type="button"
                >
                  <PasswordIcon visible={showPassword} />
                </button>
              </div>
            </label>

            <div className="form-options">
              <label className="remember-option">
                <input
                  checked={rememberSession}
                  onChange={(event) => setRememberSession(event.target.checked)}
                  type="checkbox"
                />
                <span>{text.rememberSession}</span>
              </label>
            </div>

            {error ? (
              <p className="error-message" aria-live="polite" role="alert">
                {error}
              </p>
            ) : null}

            <button className="primary-action" disabled={isSubmitting} type="submit">
              {isSubmitting ? text.submitting : text.submit}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}

type AuthenticatedHomeProps = {
  auth: StoredAuth;
  onLogout: () => void;
};

function AuthenticatedHome({
  auth,
  onLogout,
}: AuthenticatedHomeProps) {
  return (
    <main className="success-page">
      <section className="success-card">
        <div>
          <p className="eyebrow">{text.authenticated}</p>
          <h1>{text.successTitle(auth.user.full_name)}</h1>
          <p>
            {text.successCopy} <strong>{auth.user.email}</strong>.
          </p>
        </div>

        <dl className="session-list">
          <div>
            <dt>{text.tokenType}</dt>
            <dd>{auth.tokens.token_type}</dd>
          </div>
          <div>
            <dt>{text.accessExpires}</dt>
            <dd>
              {Math.round(auth.tokens.expires_in / 60)} {text.minutes}
            </dd>
          </div>
          <div>
            <dt>{text.sessionSaved}</dt>
            <dd>{new Date(auth.savedAt).toLocaleString("en-US")}</dd>
          </div>
        </dl>

        <button className="secondary-action" onClick={onLogout} type="button">
          {text.logout}
        </button>
      </section>
    </main>
  );
}

type PasswordIconProps = {
  visible: boolean;
};

function PasswordIcon({ visible }: PasswordIconProps) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      focusable="false"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      {visible ? (
        <>
          <path
            d="M3.6 12.1s2.9-5.2 8.4-5.2 8.4 5.2 8.4 5.2-2.9 5.2-8.4 5.2-8.4-5.2-8.4-5.2Z"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
          <path
            d="M12 14.7a2.7 2.7 0 1 0 0-5.4 2.7 2.7 0 0 0 0 5.4Z"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
        </>
      ) : (
        <>
          <path
            d="M4.3 4.3 19.7 19.7"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="1.8"
          />
          <path
            d="M9.9 5.3A8.4 8.4 0 0 1 12 5c5.5 0 8.4 5.2 8.4 5.2a14.2 14.2 0 0 1-2.3 2.9"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
          <path
            d="M14 14.7a2.7 2.7 0 0 1-3.7-3.7"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
          <path
            d="M6.5 7.1a13.7 13.7 0 0 0-2.9 3.1s2.9 5.2 8.4 5.2c.9 0 1.7-.1 2.4-.4"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
        </>
      )}
    </svg>
  );
}

export default App;

import { useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Layout from "./components/layout/Layout";

import { CreatorsProvider } from "./context/CreatorsContext";
import { CampaignsProvider } from "./context/CampaignsContext";
import { ToastProvider } from "./context/ToastContext";
import { ThemeProvider } from "./context/ThemeContext";
import { AuthProvider } from "./context/AuthContext";
import { BrandAuthProvider } from "./context/BrandAuthContext";
import { useAuth } from "./hooks/useAuth";
import { useBrandAuth } from "./hooks/useBrandAuth";

import Workspace from "./pages/Workspace";
import SharedCampaignView from "./pages/SharedCampaignView";
import BrandDashboard from "./pages/BrandDashboard";
import Login from "./pages/Login";
import BrandLogin from "./pages/BrandLogin";
import SetPassword from "./pages/SetPassword";

// Shown if a brand account ever lands on the internal app's own URL
// directly — e.g. by bookmarking it, or the browser remembering a session
// from before. A brand login should only ever be able to reach the
// specific Brand Dashboard links they're sent, never this app itself.
function BrandOnlyNotice() {
  const { user, signOut } = useAuth();
  return (
    <div className="flex min-h-screen items-center justify-center p-6" style={{ background: "#E7F0FA" }}>
      <div
        className="w-full max-w-sm rounded-[14px] border p-7 text-center"
        style={{ background: "#fff", borderColor: "#D9E4F2" }}
      >
        <h1 className="mb-1.5 text-xl font-semibold" style={{ fontFamily: "Fraunces, serif", color: "#10243E" }}>
          You're all set
        </h1>
        <p className="mb-1.5 text-sm leading-relaxed" style={{ color: "#5B7390" }}>
          Your password is set and this account ({user?.email}) is ready to go — but there's nothing to see at
          this address specifically.
        </p>
        <p className="mb-5 text-sm leading-relaxed" style={{ color: "#5B7390" }}>
          Ask your agency contact for the Brand Dashboard link — once you open that, you'll be logged straight
          in with this same email and password.
        </p>
        <button
          type="button"
          onClick={signOut}
          className="w-full rounded-[8px] border py-2.5 text-sm font-medium"
          style={{ borderColor: "#D9E4F2", color: "#5B7390" }}
        >
          Sign out
        </button>
      </div>
    </div>
  );
}

// Gates the internal app behind a valid Supabase session. The public
// routes below (/share/:token, /brand/:token) are handled entirely
// outside this gate, so external brand viewers never see a login screen —
// only your own team, signing in with a company email, ever hits this.
function AuthGate({ children }) {
  const { session, loading, needsPasswordSetup, isBrandUser } = useAuth();

  if (loading) {
    return (
      <div
        className="flex min-h-screen items-center justify-center text-sm"
        style={{ background: "#E7F0FA", color: "#5B7390" }}
      >
        Loading…
      </div>
    );
  }

  // A fresh invite or password-reset link lands here with an active
  // session but no password set yet — show the setup screen before
  // anything else, regardless of whether a "real" session exists.
  if (needsPasswordSetup && session) {
    return <SetPassword />;
  }

  if (!session) {
    return <Login />;
  }

  // A brand account, once fully signed in, should never actually see the
  // internal app itself — only the specific Brand Dashboard links shared
  // with them. This is a genuine block, not just a hidden link: even if
  // they land on this exact URL, they get this notice instead of the
  // real app underneath it.
  if (isBrandUser) {
    return <BrandOnlyNotice />;
  }

  return children;
}

// Brand Dashboard now requires a real login too — the brand's own account,
// set up the same way as a team invite (one-time email link → they pick
// a password → sign in with email + password after that). This uses its
// own separate session entirely (see BrandAuthProvider/useBrandAuth) —
// signing in or out here never touches the Influencer Dashboard's own
// login, and vice versa. Two independent logins, not one shared one.
function BrandAuthGate({ children }) {
  const { session, loading, needsPasswordSetup } = useBrandAuth();

  if (loading) {
    return (
      <div
        className="flex min-h-screen items-center justify-center text-sm"
        style={{ background: "#E7F0FA", color: "#5B7390" }}
      >
        Loading…
      </div>
    );
  }

  if (needsPasswordSetup && session) {
    return <SetPassword useAuthHook={useBrandAuth} />;
  }

  if (!session) {
    return <BrandLogin />;
  }

  return children;
}

export default function App() {
  // Anti-copy: blocks right-click, copy, and cut, everywhere in the app
  // (including the public Brand Dashboard). A deterrent only — doesn't
  // stop screenshots/screen recording, and can be bypassed by disabling
  // JavaScript. Excludes form fields via the CSS in main.css, so typing
  // and editing still works normally.
  useEffect(() => {
    function blockContextMenu(e) {
      e.preventDefault();
    }
    function blockCopyOrCut(e) {
      const tag = e.target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || e.target?.isContentEditable) return;
      e.preventDefault();
    }

    document.addEventListener("contextmenu", blockContextMenu);
    document.addEventListener("copy", blockCopyOrCut);
    document.addEventListener("cut", blockCopyOrCut);

    return () => {
      document.removeEventListener("contextmenu", blockContextMenu);
      document.removeEventListener("copy", blockCopyOrCut);
      document.removeEventListener("cut", blockCopyOrCut);
    };
  }, []);

  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <CreatorsProvider>
            <CampaignsProvider>
              <BrowserRouter>
                <Routes>
                  {/* Public, read-only legacy snapshot link — kept for any
                      links already sent out before the brand dashboard. */}
                  <Route path="/share/:token" element={<SharedCampaignView />} />

                  {/* Brand Dashboard now requires the brand's own login —
                      no longer a public, anyone-with-the-link route. */}
                  <Route path="/brand/:token" element={<BrandAuthProvider><BrandAuthGate><BrandDashboard /></BrandAuthGate></BrandAuthProvider>} />

                  <Route
                    path="/*"
                    element={
                      <AuthGate>
                        <Layout>
                          <Routes>
                            <Route path="/" element={<Workspace />} />
                            <Route path="/campaigns/:id" element={<Workspace />} />
                          </Routes>
                        </Layout>
                      </AuthGate>
                    }
                  />
                </Routes>
              </BrowserRouter>
            </CampaignsProvider>
          </CreatorsProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
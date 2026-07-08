import { BrowserRouter, Routes, Route } from "react-router-dom";

import Layout from "./components/layout/Layout";

import { CreatorsProvider } from "./context/CreatorsContext";
import { CampaignsProvider } from "./context/CampaignsContext";
import { ToastProvider } from "./context/ToastContext";
import { ThemeProvider } from "./context/ThemeContext";
import { AuthProvider } from "./context/AuthContext";
import { useAuth } from "./hooks/useAuth";

import Workspace from "./pages/Workspace";
import SharedCampaignView from "./pages/SharedCampaignView";
import BrandDashboard from "./pages/BrandDashboard";
import Login from "./pages/Login";

// Gates the internal app behind a valid Supabase session. The public
// routes below (/share/:token, /brand/:token) are handled entirely
// outside this gate, so external brand viewers never see a login screen —
// only your own team, signing in with a company email, ever hits this.
function AuthGate({ children }) {
  const { session, loading } = useAuth();

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

  if (!session) {
    return <Login />;
  }

  return children;
}

export default function App() {
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

                  {/* Public, interactive brand dashboard — no login
                      required, deliberately outside <AuthGate>. */}
                  <Route path="/brand/:token" element={<BrandDashboard />} />

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

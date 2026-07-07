import { BrowserRouter, Routes, Route } from "react-router-dom";

import Layout from "./components/layout/Layout";

import { CreatorsProvider } from "./context/CreatorsContext";
import { CampaignsProvider } from "./context/CampaignsContext";
import { ToastProvider } from "./context/ToastContext";
import { ThemeProvider } from "./context/ThemeContext";

import Workspace from "./pages/Workspace";
import SharedCampaignView from "./pages/SharedCampaignView";
import BrandDashboard from "./pages/BrandDashboard";

export default function App() {
  return (
    <ThemeProvider>
    <ToastProvider>
      <CreatorsProvider>
        <CampaignsProvider>
          <BrowserRouter>
            <Routes>
              {/* Public, read-only legacy snapshot link — kept for any
                  links already sent out before the brand dashboard. */}
              <Route path="/share/:token" element={<SharedCampaignView />} />

              {/* Public, interactive brand dashboard — deliberately
                  outside <Layout> so external viewers never see the
                  app's internal nav/sidebar. */}
              <Route path="/brand/:token" element={<BrandDashboard />} />

              <Route
                path="/*"
                element={
                  <Layout>
                    <Routes>
                      <Route path="/" element={<Workspace />} />
                      <Route path="/campaigns/:id" element={<Workspace />} />
                    </Routes>
                  </Layout>
                }
              />
            </Routes>
          </BrowserRouter>
        </CampaignsProvider>
      </CreatorsProvider>
    </ToastProvider>
    </ThemeProvider>
  );
}
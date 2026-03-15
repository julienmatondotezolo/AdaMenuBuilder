import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { LanguageProvider } from "./i18n";
import ProtectedRoute from "./components/ProtectedRoute";
import App from "./App";
import AuthCallback from "./pages/AuthCallback";
import LoginRedirect from "./pages/LoginRedirect";
import QrMenuViewer from "./pages/QrMenuViewer";
import EmbedMenu from "./pages/EmbedMenu";
import { pdfjs } from "react-pdf";
import pdfjsWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import "ada-design-system/styles.css";
import "./index.css";

pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <LanguageProvider>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/login" element={<LoginRedirect />} />
          <Route path="/qr/:menuId" element={<QrMenuViewer />} />
          <Route path="/embed/:menuId" element={<EmbedMenu />} />

          {/* Protected app */}
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <App />
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
      </LanguageProvider>
    </BrowserRouter>
  </StrictMode>,
);

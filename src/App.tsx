import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { MenuProvider } from "./context/MenuContext";
import { seedDefaults } from "./db/dexie";
import Dashboard from "./pages/Dashboard";
import TemplateGallery from "./pages/TemplateGallery";
import TemplateEditor from "./pages/TemplateEditor";
import MenuEditor from "./pages/MenuEditor";

function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    seedDefaults().then(() => setReady(true));
  }, []);

  if (!ready) {
    return (
      <div className="h-screen flex items-center justify-center bg-muted/30">
        <p className="text-muted-foreground text-sm">Loading...</p>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/templates" element={<TemplateGallery />} />
        <Route path="/templates/:id/edit" element={<TemplateEditor />} />
        <Route
          path="/menus/:id/edit"
          element={
            <MenuProvider>
              <MenuEditor />
            </MenuProvider>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

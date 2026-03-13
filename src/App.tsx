import { Component, useEffect, useState, type ReactNode, type ErrorInfo } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { MenuProvider } from "./context/MenuContext";
import { useAuth } from "./context/AuthContext";
import { seedDefaults } from "./db/dexie";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import TemplateGallery from "./pages/TemplateGallery";
import TemplateEditor from "./pages/TemplateEditor";
import MenuEditor from "./pages/MenuEditor";

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error("ErrorBoundary caught:", error, info); }
  render() {
    if (this.state.error) {
      return (
        <div className="p-8 text-red-600">
          <h2 className="text-lg font-bold mb-2">Something went wrong</h2>
          <pre className="text-xs whitespace-pre-wrap bg-red-50 p-4 rounded">{this.state.error.message}{"\n"}{this.state.error.stack}</pre>
          <button className="mt-4 px-4 py-2 bg-red-100 rounded" onClick={() => this.setState({ error: null })}>Try again</button>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
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
    <div className="h-screen flex overflow-hidden bg-background">
      <Sidebar />
      <div className="flex-1 overflow-hidden">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          {isAdmin && <Route path="/templates" element={<TemplateGallery />} />}
          {isAdmin && <Route path="/templates/:id/edit" element={<ErrorBoundary><TemplateEditor /></ErrorBoundary>} />}
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
      </div>
    </div>
  );
}

export default App;

import { Navigate } from "react-router-dom";
import { Spinner } from "ada-design-system";
import { useAuth } from "../context/AuthContext";

const DEV_BYPASS_AUTH = import.meta.env.DEV;

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (DEV_BYPASS_AUTH) return <>{children}</>;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted">
        <div className="text-center">
          <Spinner className="w-10 h-10 mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

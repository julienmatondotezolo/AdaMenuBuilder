import { useEffect } from "react";
import { Spinner } from "ada-design-system";
import { buildAuthRedirectUrl } from "../config/auth";

/**
 * Shows a brief loading state then redirects to AdaAuth SSO.
 */
export default function LoginRedirect() {
  useEffect(() => {
    const timer = setTimeout(() => {
      window.location.href = buildAuthRedirectUrl("/");
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted">
      <div className="text-center">
        <Spinner className="w-10 h-10 mx-auto mb-4" />
        <p className="text-sm text-muted-foreground">Redirecting to login...</p>
      </div>
    </div>
  );
}

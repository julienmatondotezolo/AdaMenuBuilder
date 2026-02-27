import { useEffect } from "react";
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-10 h-10 mx-auto mb-4 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        <p className="text-sm text-gray-500">Redirecting to login...</p>
      </div>
    </div>
  );
}

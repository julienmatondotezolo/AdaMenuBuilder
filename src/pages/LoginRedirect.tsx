import { useEffect } from "react";
import { Spinner, AdaLogo } from "ada-design-system";
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full text-center">
        <AdaLogo size="lg" variant="primary" className="mx-auto mb-6" />

        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="flex justify-center mb-4">
            <Spinner size="md" variant="primary" />
          </div>
          <p className="text-sm text-gray-600">Redirecting to login...</p>
        </div>
      </div>
    </div>
  );
}

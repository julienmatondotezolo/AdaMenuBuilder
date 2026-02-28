import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button, Spinner, AdaLogo } from "ada-design-system";
import { useAuth } from "../context/AuthContext";

const AUTH_URL =
  import.meta.env.VITE_AUTH_URL || "https://auth.adasystems.app";

type Status = "processing" | "success" | "error";

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [status, setStatus] = useState<Status>("processing");
  const [message, setMessage] = useState("Processing authentication...");

  useEffect(() => {
    const processAuth = async () => {
      const token = searchParams.get("token");
      const redirect = searchParams.get("redirect") || "/";
      const error = searchParams.get("error");

      if (error) {
        setStatus("error");
        setMessage(`Authentication failed: ${error}`);
        return;
      }

      if (!token) {
        setStatus("error");
        setMessage("No authentication token received");
        return;
      }

      setMessage("Verifying credentials...");

      const success = await login(token);
      if (success) {
        setStatus("success");
        setMessage("Authentication successful! Redirecting...");
        setTimeout(() => navigate(redirect, { replace: true }), 800);
      } else {
        setStatus("error");
        setMessage("Token validation failed. Please try again.");
      }
    };

    processAuth();
  }, [searchParams, navigate, login]);

  const getStatusColor = () => {
    switch (status) {
      case "success":
        return "text-green-600";
      case "error":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case "success":
        return (
          <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
            <span className="text-white text-sm">✓</span>
          </div>
        );
      case "error":
        return (
          <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
            <span className="text-white text-sm">✕</span>
          </div>
        );
      default:
        return <Spinner size="md" variant="primary" />;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full text-center">
        <AdaLogo size="lg" variant="primary" className="mx-auto mb-6" />

        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="flex justify-center mb-4">{getStatusIcon()}</div>

          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            AdaMenuBuilder Authentication
          </h1>

          <p className={`text-sm ${getStatusColor()}`}>{message}</p>

          {status === "error" && (
            <div className="mt-4">
              <Button
                onClick={() => {
                  const returnUrl = encodeURIComponent(
                    window.location.origin +
                      "/auth/callback?redirect=" +
                      encodeURIComponent("/"),
                  );
                  window.location.href = `${AUTH_URL}/?redirect=${returnUrl}`;
                }}
              >
                Try Again
              </Button>
            </div>
          )}

          <div className="mt-6 text-xs text-gray-500">
            <a
              href={AUTH_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-gray-700"
            >
              Powered by AdaAuth
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

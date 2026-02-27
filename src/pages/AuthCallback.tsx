import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-sm w-full text-center p-8 bg-white rounded-xl shadow-sm border border-gray-200">
        {/* Status Icon */}
        <div className="flex justify-center mb-4">
          {status === "processing" && (
            <div className="w-10 h-10 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          )}
          {status === "success" && (
            <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
              <span className="text-white text-lg">✓</span>
            </div>
          )}
          {status === "error" && (
            <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center">
              <span className="text-white text-lg">✕</span>
            </div>
          )}
        </div>

        <h1 className="text-lg font-semibold text-gray-900 mb-1">
          MenuBuilder Authentication
        </h1>
        <p
          className={`text-sm ${
            status === "success"
              ? "text-green-600"
              : status === "error"
                ? "text-red-600"
                : "text-gray-500"
          }`}
        >
          {message}
        </p>

        {status === "error" && (
          <button
            onClick={() => {
              window.location.href = `${import.meta.env.VITE_AUTH_URL || "https://auth.adasystems.app"}/?redirect=${encodeURIComponent(window.location.origin + "/auth/callback?redirect=/")}`;
            }}
            className="mt-4 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Try Again
          </button>
        )}
      </div>
    </div>
  );
}

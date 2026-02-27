import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card, Button, Spinner } from "ada-design-system";
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
    <div className="min-h-screen flex items-center justify-center bg-muted">
      <Card className="max-w-sm w-full text-center p-8">
        {/* Status Icon */}
        <div className="flex justify-center mb-4">
          {status === "processing" && (
            <Spinner className="w-10 h-10" />
          )}
          {status === "success" && (
            <div className="w-10 h-10 bg-success rounded-full flex items-center justify-center">
              <span className="text-success-foreground text-lg">✓</span>
            </div>
          )}
          {status === "error" && (
            <div className="w-10 h-10 bg-destructive rounded-full flex items-center justify-center">
              <span className="text-destructive-foreground text-lg">✕</span>
            </div>
          )}
        </div>

        <h1 className="text-lg font-semibold text-card-foreground mb-1">
          MenuBuilder Authentication
        </h1>
        <p
          className={`text-sm ${
            status === "success"
              ? "text-success"
              : status === "error"
                ? "text-destructive"
                : "text-muted-foreground"
          }`}
        >
          {message}
        </p>

        {status === "error" && (
          <Button
            onClick={() => {
              window.location.href = `${import.meta.env.VITE_AUTH_URL || "https://auth.adasystems.app"}/?redirect=${encodeURIComponent(window.location.origin + "/auth/callback?redirect=/")}`;
            }}
            className="mt-4"
          >
            Try Again
          </Button>
        )}
      </Card>
    </div>
  );
}

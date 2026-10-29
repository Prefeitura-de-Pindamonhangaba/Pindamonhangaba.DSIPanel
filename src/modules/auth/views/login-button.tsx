"use client";
import { useState } from "react";
import { authClient } from "@/shared/lib/auth/client";
import { Icon } from "@/shared/components/icon";
export function LoginButton({ enabled }: { enabled: boolean }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function login() {
    setPending(true);
    setError("");
    try {
      const result = await authClient.signIn.social({
        provider: "keycloak",
        callbackURL: "/",
        errorCallbackURL: "/login?sso=error",
      });
      if (result.error) throw new Error("Login indisponível.");
    } catch {
      setError(
        "Não foi possível entrar. Tente novamente ou entre em contato com o DSI.",
      );
      setPending(false);
    }
  }
  return (
    <div className="login-control" aria-busy={pending}>
      <button
        className="primary-button"
        type="button"
        disabled={!enabled || pending}
        onClick={login}
      >
        {pending ? "Redirecionando…" : "Login"}
        <Icon name="arrow" />
      </button>
      <p className="auth-feedback" role="alert">
        {error}
      </p>
    </div>
  );
}

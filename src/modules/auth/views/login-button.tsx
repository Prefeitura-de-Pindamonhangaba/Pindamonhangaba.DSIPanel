"use client";
import { useState } from "react";
import { authClient } from "@/shared/lib/auth/client";
import { Icon } from "@/shared/components/icon";
export function LoginButton({
  enabled,
  loginURL,
}: {
  enabled: boolean;
  loginURL: string;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [originMismatch, setOriginMismatch] = useState(false);
  async function login() {
    if (window.location.origin !== new URL(loginURL).origin) {
      setOriginMismatch(true);
      setError(
        "Este endereço difere do endereço configurado para o login. Abra o endereço abaixo para continuar.",
      );
      return;
    }
    setOriginMismatch(false);
    setPending(true);
    setError("");
    try {
      const result = await authClient.signIn.social({
        provider: "keycloak",
        callbackURL: "/",
        errorCallbackURL: "/login?sso=error",
      });
      if (result.error) {
        if (result.error.code === "AUTH_ORIGIN_MISMATCH") {
          setOriginMismatch(true);
          setError(
            "O endereço do painel foi alterado. Abra o endereço configurado para continuar.",
          );
          setPending(false);
          return;
        }
        throw new Error("Login indisponível.");
      }
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
      {originMismatch && (
        <a className="primary-button" href={loginURL}>
          Abrir endereço configurado
        </a>
      )}
    </div>
  );
}

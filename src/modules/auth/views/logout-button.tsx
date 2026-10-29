"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/shared/lib/auth/client";
export function LogoutButton() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  async function logout() {
    setPending(true);
    setError("");
    try {
      const result = await authClient.signOut();
      if (result.error) throw new Error("Saída indisponível.");
      router.replace("/login");
      router.refresh();
    } catch {
      setError("Não foi possível sair. Tente novamente.");
      setPending(false);
    }
  }
  return (
    <div className="logout-control">
      <button type="button" disabled={pending} onClick={logout}>
        {pending ? "Saindo…" : "Sair"}
      </button>
      <span role="alert">{error}</span>
    </div>
  );
}

"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="login-card error-card">
      <h1>Serviço temporariamente indisponível</h1>
      <p>Não foi possível acessar o DSI Panel. Tente novamente em instantes.</p>
      <button type="button" onClick={reset}>
        Tentar novamente
      </button>
    </main>
  );
}

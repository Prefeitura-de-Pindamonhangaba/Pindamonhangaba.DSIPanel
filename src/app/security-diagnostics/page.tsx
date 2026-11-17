import { requirePageAccess } from "@/modules/auth/controllers/access-controller";
import { DiagnosticForm } from "@/modules/security-diagnostics/views/diagnostic-form";
import { PanelShell } from "@/shared/components/panel-shell";

export default async function Page() {
  const actor = await requirePageAccess();
  return (
    <PanelShell
      title="Diagnóstico de segurança"
      active="security"
      userName={actor.name}
    >
      <DiagnosticForm />
    </PanelShell>
  );
}

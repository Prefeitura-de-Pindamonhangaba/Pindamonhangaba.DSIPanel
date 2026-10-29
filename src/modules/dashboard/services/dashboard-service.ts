import type { DashboardData } from "../models/dashboard-types";
export function getDashboard(): DashboardData {
  return {
    resources: [
      {
        title: "Chamados do DSI",
        description:
          "Acompanhe o grupo DSI no GLPI, os fornecedores e os níveis de serviço.",
        icon: "tools",
        status: "Abrir acompanhamento",
        href: "/tickets",
      },
      {
        title: "Contratos e editais",
        description:
          "Contratos vigentes da secretaria, instrumentos, aditivos e editais de licitação.",
        icon: "book",
        status: "Consultar contratos",
        href: "/contracts",
      },
      {
        title: "Gestão de acessos",
        description:
          "Usuários e permissões para um ambiente organizado e seguro.",
        icon: "users",
        status: "Acesso institucional com permissões",
      },
    ],
    milestones: [
      {
        title: "Fundação",
        description: "Estrutura e página inicial",
        current: false,
      },
      {
        title: "Identidade e acesso",
        description: "Login, sessões e permissões",
        current: false,
      },
      {
        title: "Ferramentas",
        description: "Contratos, GLPI e acompanhamento da operação",
        current: true,
      },
    ],
  };
}

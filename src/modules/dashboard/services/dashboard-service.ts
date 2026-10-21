import type { DashboardData } from "../models/dashboard-types";
export function getDashboard(): DashboardData {
  return {
    resources: [
      {
        title: "Ferramentas do DSI",
        description:
          "Um ponto de encontro para os recursos que facilitam nossa rotina.",
        icon: "tools",
        status: "Aguardando primeira ferramenta",
      },
      {
        title: "Base de conhecimento",
        description:
          "Procedimentos e orientações da equipe, reunidos em um só lugar.",
        icon: "book",
        status: "Disponível em uma próxima etapa",
      },
      {
        title: "Gestão de acessos",
        description:
          "Usuários e permissões para um ambiente organizado e seguro.",
        icon: "users",
        status: "Próxima fase do projeto",
      },
    ],
    milestones: [
      {
        title: "Fundação",
        description: "Estrutura e página inicial",
        current: true,
      },
      {
        title: "Identidade e acesso",
        description: "Login, sessões e permissões",
        current: false,
      },
      {
        title: "Ferramentas",
        description: "Primeiro módulo do departamento",
        current: false,
      },
    ],
  };
}

# Diagnóstico de segurança

O painel consulta por HTTPS a resposta inicial dos endereços autorizados do PAT e do Identifica. A operação usa HEAD com limite de oito segundos e não segue redirecionamentos. O relatório mostra a presença dos cabeçalhos selecionados e os atributos dos cookies recebidos, sem exibir seus valores. Uma resposta de redirecionamento descreve somente a URL inicial.

Informe a versão estável instalada a partir do inventário para comparar com os avisos selecionados. A comparação cobre séries explicitamente listadas no código. Distribuições com correções retroportadas devem ser verificadas com o fornecedor. Ausência de evidência, presença de cabeçalhos e correção para um aviso específico não certificam a segurança da aplicação.

Para incluir outro destino autorizado, revise a lista fixa no módulo e a validação de entrada. As consultas exigem acesso ao painel.

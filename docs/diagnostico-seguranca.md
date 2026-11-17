# Diagnóstico de segurança

Informe a URL HTTPS de um site público autorizado. A consulta usa HEAD, com limite de oito segundos, sem seguir redirecionamentos. Use um domínio com IPv4 público na porta padrão, sem parâmetros, fragmentos ou credenciais. O relatório verifica os cabeçalhos e atributos dos cookies da resposta, sem armazenar seus valores.

Depois de corrigir a configuração, use **Testar novamente**. Alterações no checklist de cabeçalhos aparecem ao repetir a mesma URL. Para exportar o resultado, clique em **Salvar em PDF** e selecione a opção de PDF no diálogo de impressão do navegador.

Os avisos oficiais de PHP e Next.js servem como referência para verificar o inventário. A consulta HTTP não determina se um CVE está presente ou corrigido.

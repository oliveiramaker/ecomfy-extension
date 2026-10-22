# Ecomfy Radar — extensão Chrome/Edge

Extensão Manifest V3 para capturar dados visíveis de anúncios da Shopee e enviar ao Radar de Produtos do Ecomfy.

## Como instalar

1. Baixe esta pasta `extension/ecomfy-radar`.
2. Abra `chrome://extensions` no Chrome ou `edge://extensions` no Edge.
3. Ative **Modo do desenvolvedor**.
4. Clique em **Carregar sem compactação**.
5. Selecione a pasta `extension/ecomfy-radar`.
6. Fixe a extensão **Ecomfy Radar** na barra do navegador.

## Como usar

1. Abra um produto da Shopee Brasil.
2. Clique na extensão.
3. Ela tenta capturar:
   - título;
   - preço;
   - vendidos;
   - nota;
   - avaliações;
   - quantidade aproximada de imagens;
   - presença de vídeo.
4. A extensão também captura um print da área visível.
5. Se o preço não for encontrado no DOM e o navegador expuser a API `TextDetector`, o print é usado como fallback OCR.
6. Confira os dados, informe seu custo e clique em **Abrir análise no Ecomfy**.
7. O Radar abre com os campos preenchidos para confirmação.

## Privacidade

A captura acontece na aba ativa após ação explícita do usuário. A extensão não usa um servidor para acessar a Shopee e não executa scraping em segundo plano.

O print permanece no popup da extensão durante a captura atual e não é enviado ao Ecomfy nesta versão.

## Observações

A estrutura visual da Shopee pode mudar. Por isso, todos os dados permanecem editáveis antes de abrir a análise. O OCR por screenshot é apenas fallback e depende de suporte do navegador à API nativa `TextDetector`.

## Atualização 0.2.0

- Reconhece vendas como `10mil+`, `1.2k+`, `1,2 mil` e `Vendidos: 123`.
- Busca a nota em texto, rótulos acessíveis e dados estruturados públicos de produto.
- Abre o domínio oficial com www e transfere os dados sem injetar código no Ecomfy.
- Preserva os dados durante o login, por até 30 minutos na mesma aba.
- Valores ausentes ficam vazios, nunca são inventados como zero. Números abreviados e quantidade de imagens são aproximações.

Para atualizar uma instalação manual: baixe o ZIP em **Code → Download ZIP** em https://github.com/oliveiramaker/ecomfy-extension, extraia e substitua os arquivos da pasta instalada. Depois clique no botão de recarregar da extensão em `chrome://extensions` ou `edge://extensions`. Se preferir, remova a versão antiga e carregue a nova pasta, aquela que contém `manifest.json`. Confira a versão **0.2.0**.

Neste repositório público os arquivos estão na raiz: selecione diretamente a pasta extraída que contém `manifest.json`. O espelho dentro do projeto Ecomfy fica em `extension/ecomfy-radar`.

A página da Shopee precisa estar carregada. Se algum dado não aparecer, use **Capturar novamente** ou preencha manualmente. Após abrir o Ecomfy, revise e clique em **Analisar oportunidade**. A extensão não dispara análise paga ou altera anúncios automaticamente.


## Atualização 0.3.0 — atividades e fornecedores

Baixe novamente os arquivos deste repositório, substitua a pasta da extensão instalada e clique em **Atualizar** no cartão Ecomfy Radar em `chrome://extensions` ou `edge://extensions`. A versão deve aparecer como **0.3.0**.

A pasta precisa incluir também **cnae-catalog.js** e **cnae-match.js**. As permissões continuam iguais.

Além dos indicadores do anúncio, a extensão envia categoria, descrição e marca quando disponíveis e sugere atividades de fabricantes/atacadistas pelo produto. O CNAE é uma atividade da empresa: a sugestão não é uma classificação fiscal oficial nem comprovação de que o vendedor fabrica o item.

Ao abrir o Ecomfy com preço e custo preenchidos, a análise e o plano de teste são preparados automaticamente. A etapa **Do teste ao fornecedor** aparece logo abaixo. O site oferece filtros por atividade e região; a listagem interna de empresas depende da conexão da fonte cadastral pelo administrador. Pesquisas externas ficam identificadas separadamente.

Os códigos/descritores do catálogo são dados públicos IBGE/CONCLA, obtidos do espelho https://github.com/Benedito00/cnae-ibge em 22/10/2026. Fonte oficial: https://servicodados.ibge.gov.br/api/v2/cnae/subclasses.

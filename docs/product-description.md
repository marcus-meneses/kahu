# Kahu: descrição do produto e visão funcional

## Visão geral

Kahu é a interface operacional voltada a empresas do mercado pet. O produto reúne em um mesmo ambiente os cadastros e fluxos necessários para acompanhar tutores, animais, catálogo, atendimento e operação diária. A proposta é reduzir consultas dispersas, repetição de dados e perda de contexto entre recepção, loja, banho e tosa, hotelaria e atendimento veterinário.

Kahu faz parte de um ecossistema de serviços. A interface concentra a experiência do usuário, enquanto Zeal expõe as regras e os dados de negócio, Enhasa cuida de identidade, sessão e autorização, e Skyway abstrai o armazenamento de arquivos. Essa separação permite que a aplicação evolua sem colocar persistência, credenciais ou armazenamento diretamente no navegador.

## Público e proposta de valor

O sistema foi concebido para pet shops, clínicas veterinárias, operações de banho e tosa, hotéis e creches, lojas especializadas e empresas que combinam mais de uma dessas atividades. O valor central é manter o animal como ponto de conexão entre tutor, atendimento e transação, sem perder o isolamento dos dados de cada cliente da plataforma.

Para a equipe operacional, Kahu oferece consulta rápida e formulários consistentes. Para gestores, projeta uma visão integrada de cadastros, catálogo, agenda e resultados. Para tutores, a direção do produto é tornar o atendimento mais contextualizado, confiável e contínuo.

## Funcionalidades disponíveis

### Dashboard

O painel inicial resume tutores, animais, produtos e serviços cadastrados e oferece atalhos para os fluxos mais usados. O logotipo da barra lateral sempre retorna ao dashboard.

### Tutores

O módulo de tutores oferece listagem paginada, busca persistida durante a sessão, criação, edição, exclusão confirmada e visualização detalhada. Os formulários validam nome, CPF, telefone, endereço, CEP, cidade e e-mail, exibindo formatação sem contaminar o valor persistido. A cidade é escolhida hierarquicamente. Telefones celulares brasileiros podem abrir uma conversa no WhatsApp, e endereços podem ser encaminhados ao Google Maps.

A navegação de detalhes conecta tutor e animais: a lista de animais do tutor pode abrir diretamente o animal em seu próprio módulo, preservando uma transição controlada e retorno coerente.

### Animais

O módulo de animais possui listagem paginada, busca persistida, criação, edição, exclusão confirmada e detalhes. Cada cadastro pode relacionar tutor principal, espécie, raça, cor, peso, porte, descrição e imagem. Espécie e raça são escolhidas em uma taxonomia hierárquica carregada sob demanda. O porte usa um seletor visual próprio, com referências vetoriais.

Imagens são enviadas como recursos: Kahu fala com Zeal, Zeal delega o armazenamento a Skyway, e o cadastro mantém somente o identificador do recurso. Visualização, substituição e exclusão seguem esse mesmo fluxo.

### Loja

A loja reúne produtos e serviços em um catálogo pesquisável. O operador alterna entre os tipos, adiciona itens ao carrinho, ajusta a composição da venda e acompanha o subtotal. O estado principal da visualização permanece durante a navegação da sessão.

### Autenticação e sessão

Rotas operacionais verificam a sessão ao carregar. Tokens vencidos são renovados de forma controlada e uma falha de autenticação leva ao login. Enhasa limita o usuário a uma sessão ativa por aplicação: um novo login no Kahu substitui a sessão Kahu anterior, sem encerrar sessões de outras aplicações autorizadas.

### Impersonação administrativa

Usuários SUP podem selecionar clientes e usuários de forma hierárquica e sob demanda. A sessão real do SUP permanece ativa, enquanto as requisições operacionais usam um token de impersonação com as permissões e o contexto do usuário escolhido. Um indicador mostra a identidade corrente e permite inspecionar os dados já carregados pelo frontend.

### Experiência operacional

A aplicação oferece internacionalização em português do Brasil e inglês, persistência temporária de filtros por módulo, modais encadeadas de detalhes, transições entre módulos, layout lateral de acesso rápido, validações antecipadas e ações adaptadas a desktop e dispositivos móveis. A área autenticada possui configuração de PWA restrita às rotas operacionais.

## Funcionalidades projetadas

### Agenda e atendimento

A arquitetura e os protótipos existentes apontam para agendas diária e mensal ligadas aos serviços. A evolução prevista inclui compromissos por animal e tutor, profissionais responsáveis, estados de atendimento, atrasos, cancelamentos e acesso direto ao cadastro relacionado.

### Veterinária

O módulo veterinário é projetado para concentrar a rotina clínica em torno do animal: atendimentos, observações, histórico, prescrições, vacinação, exames e documentos. O desenho deve reutilizar identidade, taxonomia, recursos e vínculos já existentes, mantendo o prontuário protegido pelo mesmo domínio de cliente.

### Banho, tosa, hotel e creche

Os módulos de serviços são projetados para registrar reservas, execução, preferências do animal, responsáveis, horários, observações e consumo de produtos ou serviços. Hotelaria e creche devem acrescentar períodos de permanência, disponibilidade e ocorrências.

### Vendas e pré-vendas

O modelo de domínio prevê vendas, itens de venda, pré-vendas e itens de pré-venda. Itens podem ser relacionados opcionalmente a um animal e a pré-venda pode ser relacionada ao tutor. A direção funcional é transformar o carrinho atual em fechamento, reserva, cobrança e histórico comercial sem perder o contexto pet.

### Alertas

O domínio prevê alertas por cliente e usuário, com descrição, origem, endereço interno opcional e estado de leitura. A experiência projetada no Kahu inclui uma central de alertas, navegação direta para o recurso relacionado e controle individual de leitura ou descarte.

### Gestão e indicadores

A evolução do dashboard deve trazer agenda do dia, alertas, vendas, serviços em andamento, ocupação, cadastros recentes e indicadores compatíveis com as permissões do usuário. Os dados devem ser carregados de forma incremental para não transformar o painel em um gargalo de requisições.

## Princípios de produto

- O animal é o eixo de contexto entre cadastro, atendimento e venda.
- Dados de clientes diferentes permanecem isolados no backend.
- Permissões pertencem à identidade e são aplicadas pela API, não confiadas ao frontend.
- Listas extensas usam paginação e seletores hierárquicos usam carregamento sob demanda.
- Formatação é uma responsabilidade de exibição; a persistência recebe dados normalizados.
- A interface deve favorecer consulta e ação repetida, com densidade controlada e sem ornamentação que atrapalhe a operação.
- Funcionalidades projetadas devem reutilizar os contratos e relações existentes antes de criar caminhos paralelos.

## Linguagem visual

A identidade do Kahu combina periwinkle como cor funcional principal, branco e cinzas muito claros nas superfícies, azul profundo para texto e contraste, e laranja/rosa do logotipo como acentos pontuais. Controles têm cantos discretos, bordas leves, sombras contidas e ícones pet de linhas fortes. Fotografias aparecem em contextos de apresentação e autenticação; dentro da aplicação, prevalecem áreas claras, legíveis e orientadas ao trabalho.

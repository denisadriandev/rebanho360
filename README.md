# Rebanho360

Protótipo funcional do Rebanho360, já conectado ao banco de dados real no Supabase
(projeto `rebanho360`, com as tabelas, o rateio automático de custos e os dados de
exemplo de jan/2025 a set/2026 já carregados).

Por que este projeto não roda dentro do chat do Claude: o "artifact" (a pré-visualização
que aparece na conversa) roda num navegador com bloqueio de segurança que impede
chamadas para sites externos, incluindo o Supabase. Rodando como um site normal — no seu
computador ou publicado na internet — essa restrição não existe, e o app funciona
normalmente.

## Rodar no seu computador

Pré-requisito: ter o [Node.js](https://nodejs.org) instalado (versão 18 ou mais recente).

```bash
npm install
npm run dev
```

Abra o endereço que aparecer no terminal (algo como `http://localhost:5173`).

## Publicar na internet (para acessar do celular, no campo)

A forma mais simples é pela [Vercel](https://vercel.com) ou [Netlify](https://netlify.com):

1. Crie uma conta gratuita.
2. Envie esta pasta para um repositório no GitHub (ou arraste a pasta direto no
   painel da Vercel/Netlify, sem precisar do GitHub).
3. Confirme as opções padrão (o projeto já está configurado como Vite).
4. Em alguns minutos você recebe um link do tipo `rebanho360.vercel.app`, que pode
   ser instalado como aplicativo (PWA) na tela inicial do celular.

## Sobre a conexão com o Supabase

A URL do projeto e a chave pública (`anon key`) já estão configuradas em
`src/App.jsx`. Essa chave é segura para ficar no código do site — quem protege
os dados são as políticas de segurança (RLS) configuradas no banco, não o
sigilo da chave.

**Importante:** como o app ainda não tem tela de login (autenticação foi
propositalmente deixada para uma fase futura, conforme o PRD), qualquer pessoa
que tiver o link do site publicado consegue ler e editar os dados. Está tudo
bem para uso pessoal/família enquanto você testa o app. Antes de divulgar o
link publicamente, vale me chamar para implementarmos o login.

## Estrutura

- `src/App.jsx` — todo o aplicativo (Painel, Lotes, Custos)
- `src/main.jsx` — ponto de entrada
- `src/index.css` — estilos (Tailwind CSS)

## Próximos passos sugeridos

- Autenticação (login do produtor/equipe)
- Modo offline com sincronização automática (conforme previsto no PRD)
- Editar categorias de gado, cores e textos como preferir

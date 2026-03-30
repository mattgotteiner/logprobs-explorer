# Logprobs Explorer

Logprobs Explorer is a browser-first React + TypeScript app for inspecting Azure OpenAI Responses API token log probabilities.

It keeps the `spa-starter` structure and shell patterns, then layers on:

- Azure OpenAI endpoint + API key settings
- encrypted API key persistence in the browser when supported
- model / deployment selection with reasoning fixed to `none`
- optional `temperature` and `top_p` controls
- bounded `max_output_tokens`
- token-by-token display of chosen logprobs, top alternatives, and linear probabilities

## Prerequisites

- Node.js 22+
- Access to the `@mattgotteiner` GitHub Packages scope for `@mattgotteiner/spa-ui-controls`
- An Azure OpenAI deployment that supports Responses API logprobs with reasoning effort `none`

## Getting started locally

```bash
npm login --scope=@mattgotteiner --auth-type=legacy --registry=https://npm.pkg.github.com
npm install
npm run dev
```

Then open the Vite URL, configure your Azure OpenAI settings in the sidebar, paste a prompt, and click `Test`.

## Quality commands

```bash
npm run lint
npm run typecheck
npm run test:run
npm run build
```

## Repository

- GitHub: `https://github.com/mattgotteiner/logprobs-explorer`

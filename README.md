# AI KPI App

React + TypeScript + Vite foundation for a future Power Apps Code App.

This project is intentionally local/static for the design phase. It does not connect to Power Apps, does not include `power.config.json`, and does not register Dataverse data sources yet.

## Local Commands

```bash
npm install
npm run dev
npm run build
```

## Current Structure

- `src/pages` - page-level screens
- `src/components` - reusable UI pieces
- `src/domain` - app-facing domain models
- `src/api` - API contracts
- `src/mocks` - local mock implementations
- `src/services` - provider layer currently pointed at mocks
- `src/hooks` - React data hooks

## Later Power Apps Steps

After design approval:

```bash
npx power-apps add-data-source --api-id dataverse --resource-name <logical-table-name> --org-url "https://<org>.crm.dynamics.com"
npm run build
npx power-apps push
```

Generated files under `src/generated` and `.power` should be treated as Power Apps output and not edited manually.

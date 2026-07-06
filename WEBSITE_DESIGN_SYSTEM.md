# GovDigital KPI App Design System

## Core Website Theme

The application uses a light government operations theme:

- Body background uses `--bg`, a soft blue-gray workspace background.
- Main panels use `--surface` and `--surface-raised` for clean white card surfaces.
- Borders use `--border` for thin, low-contrast separation.
- Primary actions, active navigation, and key highlights use `--primary`.
- Text uses `--text`; secondary copy uses `--text-muted`.

Primary UI tokens are defined globally in `src/index.css` under `:root` and `.dark`.

## AI Component Theme

AI components must be visually distinct from normal operational cards. They use the global AI tokens:

- `--ai`: main AI accent color.
- `--ai-strong`: heading and important AI values.
- `--ai-soft`: AI panel background tint.
- `--ai-border`: AI panel border color.

Reusable AI classes are defined in `src/index.css`:

- `ai-panel`: use for full AI widgets and AI card containers.
- `ai-icon`: use for AI icon badges.
- `ai-heading`: use for AI widget headings.
- `ai-chip`: use for warning/count pills.
- `ai-surface`: use for nested AI result rows or suggested field cards.

Current AI surfaces include:

- Focal Point dashboard: AI assistance before submission.
- Focal Point KPI edit form: AI Review Score and Suggested Fields.
- Performance Team dashboard: AI Assistance.
- Department Director dashboard: AI Assistance Widget.

When the AI color scheme needs to change, update only the AI tokens in `src/index.css`.

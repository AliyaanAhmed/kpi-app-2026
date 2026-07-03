# KPI Evaluation Workflow

This document defines the governed KPI lifecycle used by the local React mock app. The same flow should later map cleanly to Dataverse/Power Apps status choices and audit tables.

## Canonical KPI Statuses

| Status | Owner / Queue | Meaning |
| --- | --- | --- |
| `active` | Focal Point | KPI was created by Admin through a cycle and is ready for entry. |
| `draft` | Focal Point | Focal Point has entered KPI details and saved the KPI as completed draft. |
| `submitted_to_performance_team` | Performance Team | Focal Point submitted the KPI bundle to Performance Team. |
| `reviewed_by_performance_team` | Performance Team | Performance Team reviewed the KPI and added a Performance Team comment. |
| `submitted_to_director` | Department Director | Performance Team submitted the focal point bundle to the Director. |
| `reviewed_by_director` | Department Director | Director reviewed the KPI and added a Director comment. |
| `clarification_from_performance` | Focal Point | Performance Team returned the KPI for focal point clarification. |
| `clarification_from_director` | Focal Point | Director returned the KPI for focal point clarification. |
| `approved_by_director` | Performance Team | Director approved the focal point bundle and returned it to Performance Team for publishing. |
| `published` | Executive / DGE View | Performance Team published the approved KPI records. |

Legacy aliases currently retained for screen compatibility: `submitted`, `with_performance_team`, `clarification_focal`, `clarification_director`, and `director_approved`.

## Role Flow

### Admin

1. Creates KPI definitions and templates.
2. Creates an evaluation cycle and selects exactly one KPI template.
3. When the cycle is created/published for entry, the pulled KPI submissions are created as `active`.
4. Each KPI is assigned to the relevant focal point through the department/team assignment model.

### Focal Point

1. Opens assigned `active` KPIs.
2. Enters actual score, evidence, analysis, challenges, and recommendations.
3. Saves each KPI as `draft`.
4. Once all KPIs assigned to that focal point in the selected cycle are `draft`, the dashboard enables **Submit to Performance Team**.
5. Submitting moves the focal point KPI bundle to `submitted_to_performance_team`.
6. If a KPI is returned as `clarification_from_performance` or `clarification_from_director`, the focal point updates that KPI and resubmits it back to Performance Team as `submitted_to_performance_team`.

### Performance Team

1. Receives submissions grouped by focal point.
2. Reviews every KPI in that focal point bundle.
3. Adds `performanceTeamComment` on each reviewed KPI.
4. Moves each reviewed KPI to `reviewed_by_performance_team`.
5. Can raise KPI-level clarification back to the focal point as `clarification_from_performance`.
6. Once all KPIs in a focal point group are `reviewed_by_performance_team`, the group enables **Submit to Director**.
7. Submitting moves the full focal point bundle to `submitted_to_director`.
8. After Director approval, Performance Team receives `approved_by_director` KPIs and publishes focal-point-wise to `published`.

### Department Director

1. Receives Performance Team submissions grouped by focal point.
2. Reviews each KPI and adds `directorComment`.
3. Moves reviewed KPI records to `reviewed_by_director`.
4. Can raise KPI-level clarification as `clarification_from_director`.
5. Once all KPIs in a focal point group are `reviewed_by_director`, the group enables **Approved By Director**.
6. Approval moves the focal point bundle to `approved_by_director`, returning it to Performance Team for publishing.

### Executive Director And Director General

1. View `published` KPI records only.
2. Executive Director visibility is sector-scoped.
3. Director General visibility is organization-wide across sectors, departments, and KPIs.

## Clarification Loops

Performance clarification:

`submitted_to_performance_team` -> `clarification_from_performance` -> focal point updates -> `submitted_to_performance_team` -> `reviewed_by_performance_team`

Director clarification:

`submitted_to_director` -> `clarification_from_director` -> focal point updates -> `submitted_to_performance_team` -> Performance Team resubmits -> `submitted_to_director` -> `reviewed_by_director`

## Group Action Rules

- Focal Point can submit to Performance Team only when all assigned KPIs in the selected cycle are `draft`.
- Performance Team can submit a focal point group to Director only when all KPIs in that group are `reviewed_by_performance_team`.
- Director can approve a focal point group only when all KPIs in that group are `reviewed_by_director`.
- Performance Team can publish a focal point group only when all KPIs in that group are `approved_by_director`.

## Audit And Comments

Every status transition writes a history event with actor, role, timestamp, from status, to status, and note.

Reviewer comments are stored separately from history:

- `performanceTeamComment`
- `directorComment`


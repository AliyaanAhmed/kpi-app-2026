# Detailed Website Design Guide

This document describes the visual system currently used in the ICT Budgeting app so it can be reused in other apps with the same premium government-product feel.

## Design Language

The app uses a clean Abu Dhabi government enterprise style with:

- strong white surfaces
- soft blue-gray borders
- deep slate text
- compact but premium spacing
- subtle shadows instead of heavy elevation
- rounded corners without looking overly soft
- AI content treated as a distinct visual language

The overall look is polished, calm, and information-dense.

## Core Colors

These are the main colors used across the app:

- Primary blue: `#286CFF`
- Primary hover: `#1F5BFF`
- Primary active: `#0C65F5`
- Light blue surface: `#F8FBFF`
- Soft blue background: `#E7F5FF`
- Border blue: `#DDEBFF`
- Main text: `#0F172A`
- Body text: `#475569`
- Muted text: `#64748B`
- Light border: `#DCE8F6`
- Green success: `#4A9D5C`
- Red error: `#EA4F49`
- Gold warning: `#B68A35`
- Orange accent: `#EB5F24`
- AI purple accent: `#A855F7`

### Palette Intent

- Blue is the main product color.
- Green is for success or completed state.
- Red is for errors and risk.
- Orange and gold are for attention or warning.
- Purple is reserved mostly for AI surfaces and AI-related guidance.

## Page Backgrounds

The app uses different background treatments depending on the surface.

### App Body

- Default page body is light and clean.
- Most screens use white or very pale blue surfaces.
- Dark mode switches to deep navy / slate panels.

### Dashboards

- Dashboard sections often sit on white cards over a light page background.
- Hero areas may use a soft blue gradient or a soft tinted strip.
- Dashboard sub-panels use light tinted fills, usually `#F8FBFF`.

### Tables

- The table container is white.
- Filter tabs, chips, and the outer page body use the lighter body/background tone.
- This creates a clear visual separation between the data surface and the controls.

### Forms

- Create and edit forms use white section cards.
- Each section is separated by borders, padding, and soft shadows.
- Forms feel like stacked panels rather than one large flat page.

## Radius Rules

Common rounding used in the app:

- Sidebar items: around `8px`
- Small chips and pills: fully rounded
- Controls and filters: `12px` to `14px`
- Cards: `20px` to `28px`
- Modal headers and large panels: `28px` to `30px`

The UI should feel rounded but still structured.

## Shadow Rules

Shadows are used carefully.

- Dashboard cards use soft shadows such as `shadow-[0_12px_30px_rgba(15,23,42,0.06)]`
- Hover states slightly increase elevation
- Forms use lighter shadows to make each section feel separate
- AI cards often use a gentle glow or purple/blue tint rather than a strong shadow

Avoid heavy drop shadows that make the UI feel flashy.

## Hover Behavior

Hover is an important part of the interaction language.

### Standard Cards

- slight lift upward
- border shifts toward primary blue
- background may tint to `#F8FBFF`
- shadow becomes a little stronger

### Buttons

- primary buttons darken slightly on hover
- secondary buttons receive a subtle tinted background
- destructive actions stay visually clear and separate

### Sidebar Links

- active item stays fully blue
- inactive items pick up a light background on hover
- the transition is quick and subtle

### Project Cards

- hover adds a blue border and a soft blue background wash
- card lifts very slightly
- arrow or action icon shifts forward

## Sidebar Design

The sidebar is fixed, role-aware, and collapsible.

### Visual Style

- white / pale background in light mode
- dark slate background in dark mode
- active item uses solid primary blue
- inactive items stay muted until hover
- icons remain visible in both modes

### Sidebar Behavior

- expanded mode shows labels, icons, and badges
- collapsed mode shows icons only
- a floating toggle controls width
- the bottom user block is visible in expanded mode

### Sidebar Buttons and Items

- compact rounded rectangles
- strong blue active state
- subtle hover tint
- readable text hierarchy

## Header Design

The top header is intentionally calmer than the sidebar.

It is used for:

- role switching
- cycle selection
- notifications
- workspace context

Header styling remains lighter and flatter so the content area stays dominant.

## Dashboard Design

Dashboards are built around two-column sections.

### Standard Layout

- 2 components per row on desktop
- stacked layout on mobile
- use dense, actionable cards instead of large empty panels

### Dashboard Card Style

- white card surface
- rounded large radius
- subtle shadow
- icon in a small circular badge
- title at the top
- value or summary in the middle
- footer or badge below

### Dashboard Hover

- cards lift slightly
- blue border appears on hover
- text remains readable and bold

### Dashboard Components

Common dashboard components include:

- queue cards
- budget summary cards
- entity progress cards
- portfolio insight cards
- chart cards
- AI summary cards

## Table View Design

The table view is used for dense operational data.

### Structure

- white outer container
- rounded frame
- controls live outside the table on the body-colored surface
- table header is light and clearly separated

### Table Colors

- header rows use pale blue or neutral background
- row text is dark for readability
- status cells use small colored pills
- budget headers may show a dirham icon in the header only

### Table Rules

- do not over-decorate the table body
- keep filters outside the white table surface
- use clear row hover states
- keep headers compact and stable

### Filter Tabs Above Tables

Filter tabs are designed as pills on the page body, not inside the white table.

Rules:

- active tab uses solid primary blue
- inactive tab uses white or transparent body-like surfaces
- each tab may show a count badge
- tabs should feel part of the control strip, not the table

## Card View Design

Card view is used when the app needs to show structured project summaries.

### Card Structure

- title and ref at the top
- status tag
- strategic priority and classification
- budget blocks
- pending with / created by / owner info
- action link or button

### Card Colors

- white surface
- soft blue border
- pale blue section blocks inside cards
- primary blue links or action accents

### Card Hover

- lift slightly upward
- border becomes more saturated blue
- background gets a soft blue wash

## Form Design

Create and edit forms are intentionally sectioned.

### Section Cards

Each major form section uses:

- white background
- rounded corners
- subtle shadow
- internal padding
- icon + title row

### Form Body

- the page body stays light and neutral
- each section card stands on its own
- AI-assisted areas get a slight purple/blue tint

### Form Controls

- inputs are rounded
- selects use bordered white controls
- dropdowns have a clean compact look
- action buttons stay at the bottom or in a fixed footer region

## AI Component Design

AI components are intentionally distinct from standard workflow UI.

### AI Color Language

Current AI styling uses a blue-led system with optional purple treatment in older recommendation surfaces.

Primary AI colors:

- AI blue: `#286CFF`
- AI hover: `#1F5BFF`
- AI light surface: `#F8FBFF`
- AI border: `#DDEBFF`
- AI secondary blue: `#4F98FF`
- AI purple accent: `#A855F7`

### AI Surfaces

AI panels often use:

- a white body
- a tinted header strip
- a sparkles icon badge
- soft blue or purple content highlights

### AI Dashboard Components

Examples:

- AI Portfolio Summary
- AI Risk / Insight panels
- Budget Overview
- AI review flags
- AI clarification indicators

### AI Table Column Styling

In AI-related table columns:

- header text stays normal unless intentionally marked as AI
- AI data cells may use a soft tinted background
- text should remain readable and not overly washed out

### AI Accordion / Header Styling

AI accordions and expandable cards typically use:

- tinted top row
- `Sparkles` icon
- subtle blue or purple emphasis
- strong heading typography

### AI Button Styling

Primary AI buttons usually use:

- background: `#286CFF`
- hover: `#1F5BFF`
- text: white

Secondary AI buttons use:

- white background
- blue text
- pale blue border

### AI Empty / Loading States

- use blue-tinted or purple-tinted placeholders
- keep them calm and readable
- avoid busy graphics

## Status Colors

Status tags should be easy to scan.

Common intent:

- blue: active / in progress / pending review
- green: completed / approved / successful
- orange: warning / clarification / attention
- red: rejected / blocked / error
- purple: AI or special guidance

## Dropdowns and Filters

Dropdowns and filters are part of the control layer.

### Dropdown Style

- white background
- rounded corners
- thin blue-gray border
- focused state uses primary blue ring or border

### Filter Chips

- pill-shaped
- compact counts
- active tab solid blue
- inactive tab light and neutral

### Search Inputs

- white background
- rounded control
- subtle border
- readable placeholder

## Buttons

### Primary Button

- solid primary blue
- white text
- subtle shadow
- hover darkens the blue slightly

### Secondary Button

- white background
- blue border or text
- hover background becomes very light blue

### Destructive Button

- red tint
- clear warning state
- avoid using it for neutral actions

## Budget Cards and Metrics

Budget data is usually shown as:

- compact metric tiles
- budget summary blocks
- stacked amount cards
- status-aware budget labels

Rules:

- use `CurrencyAmount` style presentation where possible
- keep the dirham icon only in the header or summary label, not in every data cell
- numbers should be bold and easy to scan
- totals should not look like body text

## AI Section vs Standard Section

Keep this separation clear:

- standard business cards use blue/white enterprise styling
- AI sections use a distinct AI treatment
- AI should never look identical to normal workflow cards

## Recommended Reuse For Another Website

If you are building the same style elsewhere, reuse these patterns:

- blue primary action color
- white and pale blue surfaces
- strong rounded cards
- subtle hover lift
- compact filters and tabs above the white table
- sectioned edit/create forms with shadows
- AI panels with sparkles icon and tinted headers
- role-driven dashboard cards in two-column rows

## Quick Visual Summary

- Primary brand color: blue
- Secondary guidance color: purple for AI only
- Page background: soft neutral or pale blue
- Cards: white with soft borders and shadows
- Tables: white main container, filters outside on the body surface
- Forms: stacked white sections with clear separation
- Hover: gentle lift and stronger border
- AI: tinted, premium, sparkles-led, clearly distinct


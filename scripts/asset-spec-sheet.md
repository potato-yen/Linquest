# Linquest Asset Spec Sheet — Phase 4 Illustrations & Crests

> Style anchor: `docs/design-language.md` (古典制圖 × 植物圖鑑 × 探險日誌).
> Reference images: `docs/img_refs/*.PNG`.
>
> **Decision (2026-05-18):** Phase 4 assets are authored **in-code as
> `react-native-svg` components**, not externally-generated raster. This keeps
> everything in-repo, version-controlled, infinitely scalable, and exactly
> on-palette. This sheet is the binding design brief every SVG component must
> satisfy — treat it as the acceptance spec, not a prompt for an image model.

## Common rules (every asset)

- **Palette only from `lib/ui/tokens.ts`.** Background ivory `color.bg.base`
  `#F5EFE0`; sage `color.brand.primary` `#6B7D54`; ink `color.text.primary`
  `#2C3E1F`; muted `color.text.muted` `#8A8270`. Never pure `#000` / `#FFF`,
  never saturation > 70%, never neon.
- **Line style:** 1–1.5px equivalent stroke, `strokeLinecap="round"`,
  `strokeLinejoin="round"`, slight hand-drawn asymmetry — not strict geometry.
- **Texture:** faint dotted ink-dust / hatching only; never gloss, gradient
  (except a near-flat parchment wash), 3D, or shadow.
- **Composition:** generous negative space, off-center balance.
- **No human figures, no mascot characters, no emoji.**
- **API contract:** every component accepts `{ size?: number }` (illustrations)
  or `{ fill?: string; size?: number }` (crests). Default size 160.
  `viewBox` square `0 0 160 160` unless noted (roadmap-bg is tall).

## Illustration inventory

| Key | Component | viewBox | Motif | Mood |
|---|---|---|---|---|
| `parchmentBg` | `ParchmentBg` | tileable 160² | aged paper, sparse ink dust, no subject | neutral ground |
| `empty.noClass` | `EmptyNoClass` | 160² | wooden gate at edge of a quiet meadow | not entered yet |
| `empty.noActivity` | `EmptyNoActivity` | 160² | empty lectern + closed scroll | waiting |
| `empty.allDone` | `EmptyAllDone` | 160² | laurel wreath + open journal w/ ink check | quiet completion |
| `empty.noRank` | `EmptyNoRank` | 160² | blank wax-sealed envelope | nothing to report |
| `empty.startHere` | `EmptyStartHere` | 160² | compass + faint trail off-page | invitation |
| `error.network` | `ErrorNetwork` | 160² | torn map fragment + frayed needle | connection lost |
| `error.server` | `ErrorServer` | 160² | toppled inkwell | server fault |
| `error.unknown` | `ErrorUnknown` | 160² | closed sextant case | unexpected |
| `trail.roadmapBg` | `RoadmapBg` | `0 0 160 480` | foothills→misty peak, NO path drawn | vertical climb |
| `map.territoryBg` | `TerritoryBg` | 160² | faded topographic lines + corner compass rose, NO hex grid | old map ground |

## Group crests — `GroupCrest` (one parametric component, index 0–9)

Shield silhouette, tinted by the caller via `fill` (defaults to
`groupPalette[index]` from tokens). Inner motif rendered in
`color.text.primary` `#2C3E1F` ink:

`0` acorn · `1` leaf · `2` wave · `3` berry · `4` fern · `5` sun ·
`6` moon · `7` flame · `8` mountain · `9` anchor

`groupPalette` (source of truth `lib/ui/tokens.ts`, mirrors backend):
`#7E5A3A · #5A7E3A · #3A5A7E · #7E3A5A · #3A7E5A · #7E7E3A · #3A7E7E ·
#7E3A3A · #5A3A7E · #3A3A7E`

## Wiring

`lib/ui/illustrations/index.ts` exports the registry as React components
(no `require()` — these are SVG, not raster). `EmptyState` / `ErrorState`
accept an optional illustration **component**; `MapCanvas` renders
`TerritoryBg` as an absolutely-positioned SVG layer under the hex grid.

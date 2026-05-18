# Runtime Budget — Phase 4

> Target: 60fps on a mid-tier Android (Pixel 6a class) during the three
> heaviest flows. This file records the static analysis + mitigations applied
> in Phase 4 and the on-device profiling that is still owed.

## Heavy flows

| Flow | Worst case | Risk |
|---|---|---|
| Roadmap trail | `lastStage = 30` | 30 `StageFlag` + 1 long SVG path; only the current flag animates |
| Territory map | ~80 tiles, 5s poll | full re-render every poll; pinch/pan |
| Battle 1v1 reveal | per-question reveal cycle | choice cards + score + countdown |

## Mitigations applied (code, not just notes)

1. **Pinch/pan is off the React thread.** `MapCanvas` drives pan/zoom through
   a Reanimated worklet on an `Animated.View` transform — gestures do **not**
   trigger React re-renders, so the 80-tile tree is untouched while panning.

2. **`HexTile` is `React.memo`'d** with a hand-written comparator
   (`tileEqual`) over the visual inputs only. The territory screen polls
   every 5s; without memo every poll re-rendered all ~80 tiles even when no
   tile changed. `onPress` identity is deliberately excluded from the
   comparator (behaviour is stable per `tileId`) so an unstable parent
   callback can't defeat the memo. Expected: a poll that changes 0–2 tiles
   now re-renders 0–2 `HexTile`s instead of ~80.

3. **Refresh-wave glow uses 3 stacked circles, not an SVG blur filter.**
   `react-native-svg`'s `<FeGaussianBlur>` is unreliable / expensive on
   Android; the layered-circle fake-blur is cheap and cross-platform. This
   also resolves the plan's predicted "SVG filter expensive on Android".

4. **Cooldown stripe is one shared `<Pattern>`** in `<Defs>`, animated by a
   single Reanimated value (`stripeShift`) — O(1) animated nodes regardless
   of how many tiles are in cooldown, instead of one animator per tile.

5. **`Countdown` already self-isolates** its 1s tick in component-local
   state; the interval re-renders only the `Countdown` subtree, not the
   battle/map parent. Verified — no change needed.

## Still owed: on-device pass (operator)

Static analysis can't replace a real device. Profile on a Pixel 6a (or
equivalent) in a release build with the Hermes sampling profiler:

- [ ] Roadmap trail, `lastStage = 30` — scroll top→bottom, watch for path
      re-tessellation jank.
- [ ] Territory map, ~80 tiles — pinch/pan + a live refresh wave; confirm
      memo holds (re-render count ≈ changed tiles).
- [ ] Battle 1v1 — full reveal cycle, confirm countdown doesn't flush the
      score header.

Record any frame drops here with the offending component + fix, and commit
each fix as its own `perf(...)` commit.

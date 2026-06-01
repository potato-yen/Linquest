import {
  shouldEnableMapPan,
  supportsAnimatedCooldownPattern,
} from '../../../../../lib/ui/components/map-canvas-support';

describe('supportsAnimatedCooldownPattern', () => {
  it('keeps the animated svg cooldown pattern on web', () => {
    expect(supportsAnimatedCooldownPattern('web')).toBe(true);
  });

  it('disables the animated svg cooldown pattern on native runtimes', () => {
    expect(supportsAnimatedCooldownPattern('ios')).toBe(false);
    expect(supportsAnimatedCooldownPattern('android')).toBe(false);
  });
});

describe('shouldEnableMapPan', () => {
  it('keeps web tap-first at base zoom', () => {
    expect(shouldEnableMapPan('web', 1)).toBe(false);
    expect(shouldEnableMapPan('web', 1.009)).toBe(false);
  });

  it('re-enables web pan once the map is zoomed in', () => {
    expect(shouldEnableMapPan('web', 1.02)).toBe(true);
  });

  it('leaves native pan available regardless of zoom', () => {
    expect(shouldEnableMapPan('ios', 1)).toBe(true);
    expect(shouldEnableMapPan('android', 1)).toBe(true);
  });
});

import { supportsAnimatedCooldownPattern } from '../../../../../lib/ui/components/map-canvas-support';

describe('supportsAnimatedCooldownPattern', () => {
  it('keeps the animated svg cooldown pattern on web', () => {
    expect(supportsAnimatedCooldownPattern('web')).toBe(true);
  });

  it('disables the animated svg cooldown pattern on native runtimes', () => {
    expect(supportsAnimatedCooldownPattern('ios')).toBe(false);
    expect(supportsAnimatedCooldownPattern('android')).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';
import { typingArm } from './typingArms';

describe('keyboard arm anatomy', () => {
  it.each([-1, 1])('keeps the %s arm joined at a natural elbow and places the palm on the keys', side => {
    const shoulder = { x: side * 6.2, y: -11.6 }, contact = side < 0 ? { x: 6.24, y: -23 } : { x: 12.96, y: -19.64 };
    const arm = typingArm({ shoulder, contact, direction: { x: 1, y: -.5 }, side });
    expect(arm).not.toBeNull();
    expect(Math.hypot(arm.elbow.x - shoulder.x, arm.elbow.y - shoulder.y)).toBeLessThanOrEqual(7.6 * 1.08 + .001);
    expect(Math.hypot(arm.wrist.x - arm.elbow.x, arm.wrist.y - arm.elbow.y)).toBeLessThanOrEqual(7.2 * 1.08 + .001);
    expect(arm.wrist.x + arm.forward.x * 1.8).toBeCloseTo(contact.x);
    expect(arm.wrist.y + arm.forward.y * 1.8).toBeCloseTo(contact.y);
  });
  it('does not stretch an arm across a misaligned desk', () => {
    expect(typingArm({ shoulder: { x: -6, y: -12 }, contact: { x: 22, y: -17 }, side: -1 })).toBeNull();
  });
  it('keeps a tightly folded elbow finite and supports a reversed hand direction', () => {
    for (const direction of [{ x: 1, y: -.5 }, { x: -1, y: .5 }]) {
      const arm = typingArm({ shoulder: { x: 0, y: 0 }, contact: { x: direction.x * 1.8 + .01, y: direction.y * 1.8 }, direction, side: 1 });
      expect(Number.isFinite(arm.elbow.x) && Number.isFinite(arm.elbow.y)).toBe(true);
      expect(Math.abs(arm.elbow.x)).toBeLessThan(8);
    }
  });
});

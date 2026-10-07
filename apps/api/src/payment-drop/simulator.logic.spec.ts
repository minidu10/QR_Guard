import { makeRandom } from '../seed/payments';
import { checkDrop } from './payment-drop.logic';
import { fakeAmount, steadyCount } from './simulator.logic';

// Payments the simulator makes in one hour at a given hourly rate.
function hour(perHour: number, random: () => number) {
  let carry = 0;
  let total = 0;
  for (let m = 0; m < 60; m++) {
    const step = steadyCount(carry, perHour / 60, random);
    carry = step.carry;
    total += step.count;
  }
  return total;
}

describe('steadyCount', () => {
  it('makes nothing at a zero rate', () => {
    expect(steadyCount(0, 0)).toEqual({ count: 0, carry: 0 });
  });

  it('keeps each hour close to the normal number', () => {
    const random = makeRandom(3);
    for (const perHour of [5, 8, 14]) {
      for (let i = 0; i < 200; i++) {
        const n = hour(perHour, random);
        // Within about 15% of normal (plus rounding).
        expect(n).toBeGreaterThanOrEqual(Math.floor(perHour * 0.85) - 1);
        expect(n).toBeLessThanOrEqual(Math.ceil(perHour * 1.15));
      }
    }
  });

  it('never looks like a payment drop on its own', () => {
    const random = makeRandom(9);
    for (let i = 0; i < 500; i++) {
      const r = checkDrop(hour(5.1, random), Array(7).fill(5.1), { ratio: 0.4, minNormal: 5 });
      expect(r.drop).toBe(false);
    }
  });
});

describe('fakeAmount', () => {
  it('stays between LKR 100 and 5,000, rounded to 10', () => {
    const random = makeRandom(1);
    for (let i = 0; i < 1000; i++) {
      const a = fakeAmount(random);
      expect(a).toBeGreaterThanOrEqual(100);
      expect(a).toBeLessThanOrEqual(5000);
      expect(a % 10).toBe(0);
    }
  });
});

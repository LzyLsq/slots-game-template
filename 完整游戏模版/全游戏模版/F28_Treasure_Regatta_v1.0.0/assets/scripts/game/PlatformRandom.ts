import { native, sys } from 'cc';
import { SecureRandom, WordRandom, type Random } from '../core/Random';

/** Never substitute a predictable PRNG when the operating-system source fails. */
export function platformRandom(): Random {
  if (!sys.isNative) return new SecureRandom(globalThis.crypto);
  if (sys.os !== sys.OS.IOS) throw new Error('This native platform has no configured secure random source');
  return new WordRandom(() => {
    // Creator's shared declaration requires Android's method-signature argument;
    // the Objective-C bridge takes only class and a zero-argument selector.
    const value = (native.reflection.callStaticMethod as (className: string, selector: string) => unknown)('F28Random', 'nextWord');
    if (typeof value !== 'number') throw new Error('Native secure random source unavailable');
    return value;
  });
}

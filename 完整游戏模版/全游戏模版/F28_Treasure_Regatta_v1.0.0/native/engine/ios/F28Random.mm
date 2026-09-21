#import "F28Random.h"
#import <Security/SecRandom.h>
#include <stdint.h>

@implementation F28Random
+ (double)nextWord {
    uint32_t word = 0;
    if (SecRandomCopyBytes(kSecRandomDefault, sizeof(word), &word) != 0) {
        return -1.0;
    }
    // Every uint32_t is exactly representable in IEEE-754 double.
    return (double)word;
}
@end

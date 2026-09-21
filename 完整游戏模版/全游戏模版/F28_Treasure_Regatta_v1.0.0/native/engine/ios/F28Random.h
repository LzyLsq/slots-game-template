#import <Foundation/Foundation.h>

/** Project-owned entropy bridge. Negative result means failure, never a random word. */
@interface F28Random : NSObject
+ (double)nextWord;
@end

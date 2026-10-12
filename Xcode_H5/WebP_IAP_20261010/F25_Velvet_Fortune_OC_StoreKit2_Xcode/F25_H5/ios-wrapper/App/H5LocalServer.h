#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

@interface H5LocalServer : NSObject

- (nullable NSURL *)startWithRootPath:(NSString *)rootPath error:(NSError **)error;
- (void)stop;

@end

NS_ASSUME_NONNULL_END

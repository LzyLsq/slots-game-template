#import <WebKit/WebKit.h>

// Public Objective-C facade. StoreKit 2 verification remains in the Swift backend.
@interface LocalStore : NSObject
@property(nonatomic, strong) NSURL *allowedOrigin;
- (void)configure:(WKWebViewConfiguration *)configuration;
- (void)attach:(WKWebView *)view;
@end

#import <UIKit/UIKit.h>
#import <WebKit/WebKit.h>

@interface AppleLogin : NSObject <WKScriptMessageHandlerWithReply>
@property(nonatomic, strong) NSURL *allowedOrigin;
- (void)configure:(WKWebViewConfiguration *)configuration;
- (void)attach:(UIWindow *)window;
@end

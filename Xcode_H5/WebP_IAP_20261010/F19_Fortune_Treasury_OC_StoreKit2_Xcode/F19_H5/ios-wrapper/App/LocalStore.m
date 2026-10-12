#import "LocalStore.h"
#import "FortuneTreasuryH5Host-Swift.h"

@interface LocalStore ()
@property(nonatomic,strong) StoreKitBackend *backend;
@end

@implementation LocalStore
- (instancetype)init {
    if ((self=[super init])) self.backend=[StoreKitBackend new];
    return self;
}
- (void)configure:(WKWebViewConfiguration *)configuration { [self.backend configure:configuration]; }
- (void)attach:(WKWebView *)view { [self.backend attach:view]; }
- (NSURL *)allowedOrigin { return self.backend.allowedOrigin; }
- (void)setAllowedOrigin:(NSURL *)origin { self.backend.allowedOrigin=origin; }
@end

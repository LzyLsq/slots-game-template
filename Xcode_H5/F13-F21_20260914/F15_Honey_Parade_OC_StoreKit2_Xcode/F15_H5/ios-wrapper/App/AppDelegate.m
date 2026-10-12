#import "AppDelegate.h"
#import "H5LocalServer.h"
#import <WebKit/WebKit.h>
#import <AuthenticationServices/AuthenticationServices.h>
#import "LocalStore.h"
#import "AppleLogin.h"

@interface AppDelegate () <WKNavigationDelegate>
@property(nonatomic, strong) H5LocalServer *server;
@property(nonatomic, strong) WKWebView *webView;
@property(nonatomic, strong) LocalStore *store;
@property(nonatomic, strong) AppleLogin *appleLogin;
@property(nonatomic, strong) NSURL *localURL;
@end

@implementation AppDelegate

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions {
    self.window = [[UIWindow alloc] initWithFrame:UIScreen.mainScreen.bounds];

    UIViewController *controller = [UIViewController new];
    controller.view.backgroundColor = UIColor.blackColor;

    WKWebViewConfiguration *configuration = [WKWebViewConfiguration new];
    self.store = [LocalStore new];
    [self.store configure:configuration];
    self.appleLogin = [AppleLogin new];
    [self.appleLogin configure:configuration];
    [self.appleLogin attach:self.window];
    configuration.allowsInlineMediaPlayback = YES;
    configuration.mediaTypesRequiringUserActionForPlayback = WKAudiovisualMediaTypeNone;


    // Deliver native inactive/background state to Cocos and its audio pools.
    NSString *lifecycle = @"(() => { let inactive=false; const hidden=Object.getOwnPropertyDescriptor(Document.prototype,'hidden')?.get; Object.defineProperty(document,'hidden',{configurable:true,get:()=>inactive||(hidden?hidden.call(document):false)}); window.__localGameLifecycle=active=>{const next=!active;if(next===inactive)return;inactive=next;document.dispatchEvent(new Event('visibilitychange'));}; })();";
    [configuration.userContentController addUserScript:[[WKUserScript alloc] initWithSource:lifecycle injectionTime:WKUserScriptInjectionTimeAtDocumentStart forMainFrameOnly:YES]];

    self.webView = [[WKWebView alloc] initWithFrame:controller.view.bounds configuration:configuration];
    self.webView.autoresizingMask = UIViewAutoresizingFlexibleWidth | UIViewAutoresizingFlexibleHeight;
    self.webView.navigationDelegate = self;
    [self.store attach:self.webView];
    self.webView.opaque = NO;
    self.webView.backgroundColor = UIColor.blackColor;
    self.webView.scrollView.backgroundColor = UIColor.blackColor;
    self.webView.scrollView.bounces = NO;
    if (@available(iOS 11.0, *)) {
        self.webView.scrollView.contentInsetAdjustmentBehavior = UIScrollViewContentInsetAdjustmentNever;
    }
    [controller.view addSubview:self.webView];

    self.window.rootViewController = controller;
    [self.window makeKeyAndVisible];

    NSString *webRoot = [[NSBundle mainBundle].resourcePath stringByAppendingPathComponent:@"web"];
    self.server = [H5LocalServer new];
    NSError *error = nil;
    NSURL *url = [self.server startWithRootPath:webRoot error:&error];
    if (url) {
        self.localURL = url;
        self.store.allowedOrigin = url;
        self.appleLogin.allowedOrigin = url;
        // Clear executable/resource caches on launch, not cookies or localStorage.
        // An app update must never combine old JS with new native purchase code.
        NSSet *cacheTypes = [NSSet setWithObjects:WKWebsiteDataTypeDiskCache, WKWebsiteDataTypeMemoryCache, nil];
        [configuration.websiteDataStore removeDataOfTypes:cacheTypes modifiedSince:NSDate.distantPast completionHandler:^{
            [self.webView loadRequest:[NSURLRequest requestWithURL:url
                                                      cachePolicy:NSURLRequestReloadIgnoringLocalCacheData
                                                  timeoutInterval:30.0]];
        }];
    } else {
        NSLog(@"Failed to start local H5 server: %@", error);
        UIAlertController *alert = [UIAlertController alertControllerWithTitle:@"Unable to start" message:@"The local game port is unavailable. Close other preview apps and reopen Honey Parade." preferredStyle:UIAlertControllerStyleAlert];
        [alert addAction:[UIAlertAction actionWithTitle:@"OK" style:UIAlertActionStyleDefault handler:nil]];
        [controller presentViewController:alert animated:YES completion:nil];
    }

    return YES;
}

- (void)webView:(WKWebView *)webView decidePolicyForNavigationAction:(WKNavigationAction *)action decisionHandler:(void (^)(WKNavigationActionPolicy))decisionHandler {
    NSURL *url = action.request.URL;
    BOOL local = [url.scheme isEqualToString:self.localURL.scheme] && [url.host isEqualToString:self.localURL.host] && [url.port isEqual:self.localURL.port];
    decisionHandler(local ? WKNavigationActionPolicyAllow : WKNavigationActionPolicyCancel);
    if (!local && ([url.scheme isEqualToString:@"https"] || [url.scheme isEqualToString:@"mailto"])) {
        [UIApplication.sharedApplication openURL:url options:@{} completionHandler:nil];
    }
}

- (void)setGameActive:(BOOL)active {
    [self.webView setAllMediaPlaybackSuspended:!active completionHandler:nil];
    [self.webView evaluateJavaScript:active ? @"window.__localGameLifecycle?.(true)" : @"window.__localGameLifecycle?.(false)" completionHandler:nil];
}
- (void)applicationWillResignActive:(UIApplication *)application { [self setGameActive:NO]; }
- (void)applicationDidEnterBackground:(UIApplication *)application { [self setGameActive:NO]; }
- (void)applicationDidBecomeActive:(UIApplication *)application { [self setGameActive:YES]; }

#if DEBUG
- (void)webView:(WKWebView *)webView didFinishNavigation:(WKNavigation *)navigation {
    if (![NSProcessInfo.processInfo.arguments containsObject:@"--lively-media-smoke"]) return;
    NSString *script = @"const audio=new Audio(new URL('audio/music-home.m4a',location.href));const result={};try{await Promise.race([audio.play(),new Promise((_,reject)=>setTimeout(()=>reject(new Error('AAC timeout')),10000))]);await new Promise(resolve=>setTimeout(resolve,600));if(audio.paused||audio.currentTime<=0||audio.readyState<2)throw new Error('AAC did not advance');result.passed=true;result.time=audio.currentTime;result.duration=audio.duration;}catch(error){result.passed=false;result.error=String(error);result.mediaError=audio.error?.code;}finally{audio.pause();audio.removeAttribute('src');audio.load();}return JSON.stringify(result);";
    [webView callAsyncJavaScript:script arguments:@{} inFrame:nil inContentWorld:WKContentWorld.pageWorld completionHandler:^(id value,NSError *error){NSLog(@"LIVELY_MEDIA_SMOKE F15 %@ %@",value,error);}];
}
#endif

- (void)webView:(WKWebView *)webView didFailProvisionalNavigation:(WKNavigation *)navigation withError:(NSError *)error {
    NSLog(@"H5 provisional navigation failed: %@", error);
}

- (void)webView:(WKWebView *)webView didFailNavigation:(WKNavigation *)navigation withError:(NSError *)error {
    NSLog(@"H5 navigation failed: %@", error);
}

@end

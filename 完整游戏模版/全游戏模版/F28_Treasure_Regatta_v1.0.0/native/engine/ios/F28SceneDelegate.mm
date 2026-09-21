#import "F28SceneDelegate.h"
#import "AppDelegate.h"
#import "F28SceneScreen.h"
#import "service/SDKWrapper.h"
#import <os/log.h>

@interface F28SceneDelegate ()
@property(nonatomic, weak) UIApplication *application;
@property(nonatomic, weak) AppDelegate *gameDelegate;
@end

@implementation F28SceneDelegate

- (void)scene:(UIScene *)scene willConnectToSession:(UISceneSession *)session options:(UISceneConnectionOptions *)connectionOptions {
    if (![scene isKindOfClass:UIWindowScene.class]) return;
    // Resolve only the process coordinator, never enumerate global scenes/windows.
    // The legacy Cocos/SDK bridge still takes UIApplication lifecycle arguments.
    self.application = UIApplication.sharedApplication;
    self.gameDelegate = (AppDelegate *)self.application.delegate;
    self.window = [[UIWindow alloc] initWithWindowScene:(UIWindowScene *)scene];
    F28SetGameWindow(self.window);
    [self.gameDelegate connectGameWindow:self.window];
    os_log_info(OS_LOG_DEFAULT, "F28 scene connected; engineStarted=%{public}d", self.gameDelegate.engineStarted);
}

- (void)sceneWillResignActive:(UIScene *)scene {
    [[SDKWrapper shared] applicationWillResignActive:self.application];
    if (self.gameDelegate.engineStarted) [self.gameDelegate.appDelegateBridge applicationWillResignActive:self.application];
    os_log_info(OS_LOG_DEFAULT, "F28 scene resigned active");
}

- (void)sceneDidBecomeActive:(UIScene *)scene {
    [[SDKWrapper shared] applicationDidBecomeActive:self.application];
    if (self.gameDelegate.engineStarted) [self.gameDelegate.appDelegateBridge applicationDidBecomeActive:self.application];
    os_log_info(OS_LOG_DEFAULT, "F28 scene became active");
}

- (void)sceneDidEnterBackground:(UIScene *)scene {
    [[SDKWrapper shared] applicationDidEnterBackground:self.application];
    os_log_info(OS_LOG_DEFAULT, "F28 scene entered background");
}

- (void)sceneWillEnterForeground:(UIScene *)scene {
    [[SDKWrapper shared] applicationWillEnterForeground:self.application];
    os_log_info(OS_LOG_DEFAULT, "F28 scene entering foreground");
}

@end

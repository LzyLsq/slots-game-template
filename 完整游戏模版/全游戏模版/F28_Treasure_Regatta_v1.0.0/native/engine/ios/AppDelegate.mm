/****************************************************************************
 Copyright (c) 2010-2013 cocos2d-x.org
 Copyright (c) 2013-2016 Chukong Technologies Inc.
 Copyright (c) 2017-2022 Xiamen Yaji Software Co., Ltd.

 http://www.cocos.com

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated engine source code (the "Software"), a limited,
 worldwide, royalty-free, non-assignable, revocable and non-exclusive license
 to use Cocos Creator solely to develop games on your target platforms. You shall
 not use Cocos Creator software for developing other software or tools that's
 used for developing games. You are not granted to publish, distribute,
 sublicense, and/or sell copies of Cocos Creator.

 The software or tools in this License Agreement are licensed, not sold.
 Xiamen Yaji Software Co., Ltd. reserves all rights not expressly granted to you.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
****************************************************************************/

#import "AppDelegate.h"
#import "ViewController.h"
#import "View.h"

#include "platform/ios/IOSPlatform.h"
#import "platform/ios/AppDelegateBridge.h"
#import "service/SDKWrapper.h"

@interface AppDelegate ()
@property(nonatomic, weak) UIWindow *gameWindow;
@property(nonatomic, weak) UIApplication *application;
@property(nonatomic, copy) NSDictionary *launchOptions;
@end

@implementation AppDelegate
@synthesize appDelegateBridge;

#pragma mark -
#pragma mark Application lifecycle

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions {
    [[SDKWrapper shared] application:application didFinishLaunchingWithOptions:launchOptions];
    appDelegateBridge = [[AppDelegateBridge alloc] init];
    self.application = application;
    self.launchOptions = launchOptions;
    return YES;
}

- (UIWindow *)window {
    return self.gameWindow;
}

- (void)connectGameWindow:(UIWindow *)window {
    // A single engine/view survives a scene reconnect; never start another loop.
    NSAssert([NSThread isMainThread], @"Scene connection must run on the main thread");
    self.gameWindow = window;
    if (!_viewController) {
        _viewController = [[ViewController alloc] init];
        _viewController.view = [[View alloc] initWithFrame:window.bounds];
        _viewController.view.multipleTouchEnabled = YES;
    }
    window.rootViewController = _viewController;
    _viewController.view.contentScaleFactor = window.traitCollection.displayScale;
    [window makeKeyAndVisible];
    if (!_engineStarted) {
        _engineStarted = YES;
        [appDelegateBridge application:self.application didFinishLaunchingWithOptions:self.launchOptions];
        self.launchOptions = nil;
    }
}

- (void)applicationWillTerminate:(UIApplication *)application {
    [[SDKWrapper shared] applicationWillTerminate:application];
    if (_engineStarted) [appDelegateBridge applicationWillTerminate:application];
}

#pragma mark -
#pragma mark Memory management

- (void)applicationDidReceiveMemoryWarning:(UIApplication *)application {
    [[SDKWrapper shared] applicationDidReceiveMemoryWarning:application];
}

@end

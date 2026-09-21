#import "AppleLogin.h"
#import <AuthenticationServices/AuthenticationServices.h>
#import <CommonCrypto/CommonDigest.h>

@interface AppleLogin () <ASAuthorizationControllerDelegate, ASAuthorizationControllerPresentationContextProviding>
@property(nonatomic, weak) UIWindow *window;
@property(nonatomic, strong) ASAuthorizationController *controller;
@property(nonatomic, copy) void (^completion)(id, NSString *);
@end

@implementation AppleLogin
- (void)attach:(UIWindow *)window { self.window = window; }
- (void)configure:(WKWebViewConfiguration *)configuration {
    [configuration.userContentController addScriptMessageHandlerWithReply:self contentWorld:WKContentWorld.pageWorld name:@"appleLogin"];
    NSString *script = @"(()=>{const call=(method,args={})=>window.webkit.messageHandlers.appleLogin.postMessage({method,...args});Object.defineProperty(window,'__AURELIA_APPLE_AUTH__',{value:Object.freeze({isAvailable:()=>call('available'),authorize:rawNonce=>call('authorize',{rawNonce}),credentialState:userIdentifier=>call('state',{userIdentifier})}),writable:false,configurable:false});})();";
    [configuration.userContentController addUserScript:[[WKUserScript alloc] initWithSource:script injectionTime:WKUserScriptInjectionTimeAtDocumentStart forMainFrameOnly:YES]];
}
- (void)userContentController:(WKUserContentController *)controller didReceiveScriptMessage:(WKScriptMessage *)message replyHandler:(void (^)(id, NSString *))reply {
    WKSecurityOrigin *origin = message.frameInfo.securityOrigin;
    if (!message.frameInfo.isMainFrame || !self.allowedOrigin || ![origin.protocol isEqual:self.allowedOrigin.scheme] || ![origin.host isEqual:self.allowedOrigin.host] || origin.port != self.allowedOrigin.port.integerValue || ![message.body isKindOfClass:NSDictionary.class]) { reply(nil,@"Untrusted frame"); return; }
    NSDictionary *body = message.body; NSString *method = body[@"method"];
    if ([method isEqual:@"available"]) { reply(@YES,nil); return; }
    if ([method isEqual:@"state"]) {
        NSString *user = body[@"userIdentifier"];
        if (![user isKindOfClass:NSString.class] || !user.length || user.length > 256) { reply(nil,@"Invalid Apple user"); return; }
        [[ASAuthorizationAppleIDProvider new] getCredentialStateForUserID:user completion:^(ASAuthorizationAppleIDProviderCredentialState state, NSError *error) {
            dispatch_async(dispatch_get_main_queue(), ^{
                if (error) { reply(nil,error.localizedDescription); return; }
                NSString *value = @"not-found";
                if (state == ASAuthorizationAppleIDProviderCredentialAuthorized) value = @"authorized";
                if (state == ASAuthorizationAppleIDProviderCredentialRevoked) value = @"revoked";
                if (state == ASAuthorizationAppleIDProviderCredentialTransferred) value = @"transferred";
                reply(value,nil);
            });
        }]; return;
    }
    if (![method isEqual:@"authorize"]) { reply(nil,@"Unknown Apple sign-in method"); return; }
    if (self.completion) { reply(nil,@"Apple sign-in is already in progress"); return; }
    NSString *nonce = body[@"rawNonce"];
    if (![nonce isKindOfClass:NSString.class] || nonce.length < 16 || nonce.length > 256 || !self.window) { reply(nil,@"Invalid authorization request"); return; }
    NSData *data = [nonce dataUsingEncoding:NSUTF8StringEncoding]; unsigned char hash[CC_SHA256_DIGEST_LENGTH];
    CC_SHA256(data.bytes,(CC_LONG)data.length,hash);
    NSMutableString *hex = [NSMutableString string];
    for (NSUInteger i=0;i<sizeof(hash);i++) [hex appendFormat:@"%02x",hash[i]];
    ASAuthorizationAppleIDRequest *request = [[ASAuthorizationAppleIDProvider new] createRequest];
    request.requestedScopes = @[ASAuthorizationScopeFullName,ASAuthorizationScopeEmail]; request.nonce = hex;
    self.controller = [[ASAuthorizationController alloc] initWithAuthorizationRequests:@[request]];
    self.completion = reply; self.controller.delegate = self; self.controller.presentationContextProvider = self;
    [self.controller performRequests];
}
- (ASPresentationAnchor)presentationAnchorForAuthorizationController:(ASAuthorizationController *)controller { return self.window; }
- (void)authorizationController:(ASAuthorizationController *)controller didCompleteWithAuthorization:(ASAuthorization *)authorization {
    if (![authorization.credential isKindOfClass:ASAuthorizationAppleIDCredential.class]) { [self finish:@{@"status":@"failed",@"message":@"Apple returned incomplete credentials."}]; return; }
    ASAuthorizationAppleIDCredential *credential = (id)authorization.credential;
    NSString *token = credential.identityToken.length ? [[NSString alloc] initWithData:credential.identityToken encoding:NSUTF8StringEncoding] : nil;
    if (!credential.user.length || !token.length) { [self finish:@{@"status":@"failed",@"message":@"Apple returned incomplete credentials."}]; return; }
    [self finish:@{@"status":@"authorized",@"userIdentifier":credential.user,@"identityToken":token,@"givenName":credential.fullName.givenName ?: @"",@"familyName":credential.fullName.familyName ?: @""}];
}
- (void)authorizationController:(ASAuthorizationController *)controller didCompleteWithError:(NSError *)error {
    BOOL cancelled = [error.domain isEqual:ASAuthorizationErrorDomain] && error.code == ASAuthorizationErrorCanceled;
    [self finish:@{@"status":cancelled ? @"cancelled" : @"failed",@"message":cancelled ? @"Apple sign-in cancelled." : [NSString stringWithFormat:@"Apple sign-in failed (%ld). Check the Apple ID on this iPhone and the app's Sign in with Apple capability.",(long)error.code]}];
}
- (void)finish:(NSDictionary *)result {
    void (^reply)(id,NSString *) = self.completion; self.completion = nil; self.controller = nil;
    if (reply) reply(result,nil);
}
@end

// Native authorization only. An Apple authorization is NOT an authenticated game session.
export function createAppleAuthorization(bridge=globalThis.webkit?.messageHandlers?.fortuneApple){
 return {
  async status(){return bridge?bridge.postMessage({action:'status'}):{nativeAuthorizationAvailable:false,serverSessionIntegrated:false};},
  async authorize(){if(!bridge)throw new Error('appleNativeRequired');return bridge.postMessage({action:'authorize'});},
  async credentialState(user){if(!bridge)throw new Error('appleNativeRequired');return bridge.postMessage({action:'credentialState',user});}
 };
}

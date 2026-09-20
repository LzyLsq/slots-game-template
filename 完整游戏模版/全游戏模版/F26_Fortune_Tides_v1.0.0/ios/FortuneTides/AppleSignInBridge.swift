import AuthenticationServices
import CryptoKit
import Security
import WebKit

/// Returns an authorization for server verification, never a game login session.
/// Only the bundled main frame may request Apple credentials.
@MainActor final class AppleSignInBridge: NSObject, WKScriptMessageHandlerWithReply, ASAuthorizationControllerDelegate, ASAuthorizationControllerPresentationContextProviding {
    weak var presenter: UIViewController?
    private var completion: ((Any?, String?) -> Void)?
    private var authorization: ASAuthorizationController?
    private var nonce = ""
    private var requestState = ""
    private var timeout: DispatchWorkItem?

    init(presenter: UIViewController) { self.presenter = presenter }

    func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage, replyHandler: @escaping (Any?, String?) -> Void) {
        guard message.frameInfo.isMainFrame,
              message.frameInfo.securityOrigin.protocol == "fortune",
              message.frameInfo.securityOrigin.host == "game",
              let body = message.body as? [String: Any], let action = body["action"] as? String else {
            replyHandler(nil, "invalidRequest"); return
        }
        switch action {
        case "status":
            replyHandler(["nativeAuthorizationAvailable": true, "serverSessionIntegrated": false], nil)
        case "credentialState":
            guard let user = body["user"] as? String, !user.isEmpty, user.count <= 256 else {
                replyHandler(nil, "invalidRequest"); return
            }
            ASAuthorizationAppleIDProvider().getCredentialState(forUserID: user) { state, error in
                DispatchQueue.main.async {
                    guard error == nil else { replyHandler(nil, "credentialStateFailed"); return }
                    let value: String
                    switch state {
                    case .authorized: value = "authorized"
                    case .revoked: value = "revoked"
                    case .notFound: value = "notFound"
                    case .transferred: value = "transferred"
                    @unknown default: value = "unknown"
                    }
                    replyHandler(["state": value], nil)
                }
            }
        case "authorize":
            guard completion == nil else { replyHandler(nil, "authorizationBusy"); return }
            guard presenter?.view.window != nil else { replyHandler(nil, "presentationUnavailable"); return }
            var bytes = [UInt8](repeating: 0, count: 32)
            guard SecRandomCopyBytes(kSecRandomDefault, bytes.count, &bytes) == errSecSuccess else {
                replyHandler(nil, "secureRandomUnavailable"); return
            }
            nonce = bytes.map { String(format: "%02x", $0) }.joined()
            requestState = UUID().uuidString
            let request = ASAuthorizationAppleIDProvider().createRequest()
            request.requestedScopes = [.fullName, .email]
            request.nonce = SHA256.hash(data: Data(nonce.utf8)).map { String(format: "%02x", $0) }.joined()
            request.state = requestState
            completion = replyHandler
            let flow = ASAuthorizationController(authorizationRequests: [request])
            authorization = flow
            flow.delegate = self
            flow.presentationContextProvider = self
            let deadline = DispatchWorkItem { [weak self] in self?.finish(nil, "authorizationTimedOut") }
            timeout = deadline
            DispatchQueue.main.asyncAfter(deadline: .now() + 120, execute: deadline)
            flow.performRequests()
        default: replyHandler(nil, "unsupportedAction")
        }
    }

    func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        presenter?.view.window ?? ASPresentationAnchor()
    }

    func authorizationController(controller: ASAuthorizationController, didCompleteWithAuthorization result: ASAuthorization) {
        guard controller === authorization, let credential = result.credential as? ASAuthorizationAppleIDCredential,
              credential.state == requestState,
              let token = credential.identityToken.flatMap({ String(data: $0, encoding: .utf8) }), !token.isEmpty,
              let code = credential.authorizationCode.flatMap({ String(data: $0, encoding: .utf8) }), !code.isEmpty else {
            if controller === authorization { finish(nil, "invalidAppleAuthorization") }; return
        }
        finish(["state": "authorized", "identityToken": token, "authorizationCode": code,
                "userIdentifier": credential.user, "rawNonce": nonce,
                "givenName": credential.fullName?.givenName ?? "", "familyName": credential.fullName?.familyName ?? ""], nil)
    }

    func authorizationController(controller: ASAuthorizationController, didCompleteWithError error: Error) {
        guard controller === authorization else { return }
        if (error as? ASAuthorizationError)?.code == .canceled { finish(["state": "cancelled"], nil) }
        else { finish(nil, "appleAuthorizationFailed") }
    }

    private func finish(_ result: Any?, _ error: String?) {
        let reply = completion
        completion = nil; authorization = nil; nonce = ""; requestState = ""
        timeout?.cancel(); timeout = nil
        reply?(result, error)
    }
}

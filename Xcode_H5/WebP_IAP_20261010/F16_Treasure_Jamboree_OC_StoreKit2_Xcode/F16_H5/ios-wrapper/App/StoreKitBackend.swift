import Foundation
import StoreKit
import WebKit

/// StoreKit verifies the signed transaction on-device. No publisher server is used.
@MainActor @objc(StoreKitBackend) public final class StoreKitBackend: NSObject, WKScriptMessageHandlerWithReply {
    private let allowed: Set<String> = ["com.publisher.treasurejamboree.coins.purse","com.publisher.treasurejamboree.coins.bullion","com.publisher.treasurejamboree.coins.chest","com.publisher.treasurejamboree.coins.vault"]
    private var delivered: [String: Transaction] = [:]
    private var listener: Task<Void, Never>?
    private var purchasing = false
    private weak var webView: WKWebView?
    @objc public var allowedOrigin: URL?

    @objc public func configure(_ configuration: WKWebViewConfiguration) {
        configuration.userContentController.addScriptMessageHandler(self, contentWorld: .page, name: "localStore")
        let script = """
        (() => {
          const call = (method, args = {}) => window.webkit.messageHandlers.localStore.postMessage({method, ...args});
          Object.defineProperty(window, '__AURELIA_IAP__', {value: Object.freeze({
            products: productIds => call('products', {productIds}),
            purchase: (productId, appAccountToken) => call('purchase', {productId, appAccountToken}),
            restore: appAccountToken => call('restore', {appAccountToken}),
            finish: transactionId => call('finish', {transactionId})
          }), writable: false, configurable: false});
        })();
        """
        configuration.userContentController.addUserScript(WKUserScript(source: script, injectionTime: .atDocumentStart, forMainFrameOnly: true))
    }

    @objc public func attach(_ view: WKWebView) {
        webView = view
        listener = Task { [weak self] in
            for await _ in Transaction.updates {
                if Task.isCancelled { return }
                // The TS service recovers unfinished transactions periodically; do not finish here.
                _ = try? await self?.webView?.evaluateJavaScript("window.dispatchEvent(new Event('local-store-update'))")
            }
        }
    }

    private func verified(_ result: VerificationResult<Transaction>, account: UUID) throws -> Transaction {
        guard case .verified(let tx) = result,
              allowed.contains(tx.productID), tx.productType == .consumable,
              tx.revocationDate == nil, tx.appAccountToken == account else {
            throw NSError(domain: "LocalStore", code: 1, userInfo: [NSLocalizedDescriptionKey: "Transaction verification or account check failed."])
        }
        return tx
    }

    private func response(_ tx: Transaction) -> [String: Any] {
        delivered[String(tx.id)] = tx
        return ["status": "verified", "transactionId": String(tx.id), "productId": tx.productID,
                "appAccountToken": tx.appAccountToken!.uuidString]
    }

    public func userContentController(_ userContentController: WKUserContentController,
                               didReceive message: WKScriptMessage,
                               replyHandler: @escaping (Any?, String?) -> Void) {
        guard message.frameInfo.isMainFrame, let origin = allowedOrigin,
              message.frameInfo.securityOrigin.protocol == origin.scheme,
              message.frameInfo.securityOrigin.host == origin.host,
              message.frameInfo.securityOrigin.port == origin.port,
              let body = message.body as? [String: Any], let method = body["method"] as? String else {
            replyHandler(nil, "Untrusted frame"); return
        }
        Task {
            do { replyHandler(try await handle(method, body), nil) }
            catch { replyHandler(nil, error.localizedDescription) }
        }
    }

    // Kept separate from the web handler for native StoreKit testing.
    func handle(_ method: String, _ body: [String: Any]) async throws -> Any {
        switch method {
        case "products":
            let ids = Set(body["productIds"] as? [String] ?? []).intersection(allowed)
            return try await Product.products(for: ids).map {
                ["productId": $0.id, "displayPrice": $0.displayPrice, "displayName": $0.displayName]
            }
        case "purchase":
            guard !purchasing else { return ["status": "pending", "message": "A purchase is already in progress."] }
            guard let id = body["productId"] as? String, allowed.contains(id),
                  let token = body["appAccountToken"] as? String, let account = UUID(uuidString: token) else {
                throw failure("Invalid product or account")
            }
            purchasing = true
            defer { purchasing = false }
            guard let product = try await Product.products(for: [id]).first, product.type == .consumable else {
                throw failure("Product unavailable. Configure App Store Connect or enable the local StoreKit test scheme.")
            }
            switch try await product.purchase(options: [.appAccountToken(account)]) {
            case .success(let result): return response(try verified(result, account: account))
            case .userCancelled: return ["status": "cancelled"]
            case .pending: return ["status": "pending"]
            @unknown default: return ["status": "failed"]
            }
        case "restore":
            guard let token = body["appAccountToken"] as? String, let account = UUID(uuidString: token) else {
                throw failure("Invalid account")
            }
            var results: [[String: Any]] = []
            for await result in Transaction.unfinished {
                if let tx = try? verified(result, account: account) { results.append(response(tx)) }
            }
            return results
        case "finish":
            guard let id = body["transactionId"] as? String, let tx = delivered[id] else {
                throw failure("Transaction was not verified in this session")
            }
            await tx.finish()
            delivered.removeValue(forKey: id)
            return true
        default: throw failure("Unknown StoreKit method")
        }
    }

    private func failure(_ message: String) -> NSError {
        NSError(domain: "LocalStore", code: 2, userInfo: [NSLocalizedDescriptionKey: message])
    }
}

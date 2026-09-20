import Foundation
import StoreKit
import WebKit

/// A real StoreKit product lookup, deliberately fail-closed for payments until
/// the app has a transaction ledger and the web wallet uses that ledger.
@MainActor final class StoreCatalogBridge: NSObject, WKScriptMessageHandlerWithReply {
    func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage, replyHandler: @escaping (Any?, String?) -> Void) {
        guard message.frameInfo.isMainFrame,
              message.frameInfo.securityOrigin.protocol == "fortune",
              message.frameInfo.securityOrigin.host == "game",
              let body = message.body as? [String: Any],
              let action = body["action"] as? String else {
            replyHandler(nil, "invalidRequest"); return
        }
        let identifiers = Bundle.main.object(forInfoDictionaryKey: "FortuneProductIdentifiers") as? [String] ?? []
        switch action {
        case "status":
            replyHandler(["storeKitAvailable": true, "productsConfigured": !identifiers.isEmpty, "purchasesEnabled": false, "reason": "nativeLedgerNotIntegrated"], nil)
        case "products":
            guard !identifiers.isEmpty else {
                replyHandler(["state": "notConfigured", "products": []] as [String: Any], nil); return
            }
            Task { @MainActor in
                do {
                    let products = try await Product.products(for: identifiers)
                    let rows: [[String: Any]] = products.map { ["id": $0.id, "name": $0.displayName, "description": $0.description, "displayPrice": $0.displayPrice] }
                    replyHandler(["state": products.isEmpty ? "unavailable" : "available", "products": rows], nil)
                } catch { replyHandler(["state": "storeUnavailable", "products": []] as [String: Any], nil) }
            }
        case "purchase", "restore":
            replyHandler(["state": "unavailable", "reason": "nativeLedgerNotIntegrated"], nil)
        default: replyHandler(nil, "unsupportedAction")
        }
    }
}

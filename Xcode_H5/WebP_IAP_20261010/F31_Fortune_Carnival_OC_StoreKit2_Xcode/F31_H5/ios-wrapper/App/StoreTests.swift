import XCTest
import StoreKit
import StoreKitTest
import WebKit
@testable import FortuneCarnivalH5

@MainActor final class StoreTests: XCTestCase {
    func testWebPResourcesLoadFromLocalServer() async throws {
        let view = try XCTUnwrap(UIApplication.shared.windows.first?.rootViewController?.view.subviews.compactMap { $0 as? WKWebView }.first)
        for _ in 0..<160 {
            if (try? await view.evaluateJavaScript("document.readyState === 'complete' && location.protocol === 'http:'")) as? Bool == true { break }
            try await Task.sleep(nanoseconds: 250_000_000)
        }
        let root = try XCTUnwrap(Bundle.main.resourceURL?.appendingPathComponent("web"))
        let enumerator = try XCTUnwrap(FileManager.default.enumerator(at: root, includingPropertiesForKeys: nil))
        var paths: [String] = []
        for case let url as URL in enumerator where url.pathExtension == "webp" {
            paths.append(String(url.path.dropFirst(root.path.count + 1)))
        }
        XCTAssertFalse(paths.isEmpty)
        let loaded = try await view.callAsyncJavaScript("""
          for (const src of paths) {
            const r=await fetch(src);
            if(!r.ok||!r.headers.get('content-type')?.includes('image/webp'))throw Error('WebP HTTP/MIME '+src);
            const b=new Uint8Array(await r.arrayBuffer());
            if(String.fromCharCode(...b.slice(0,4))!=='RIFF'||String.fromCharCode(...b.slice(8,12))!=='WEBP')throw Error('Invalid WebP '+src);
          }
          for(const src of paths)await new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>image.naturalWidth>0&&image.naturalHeight>0?resolve(true):reject(Error('Empty image '+src));image.onerror=()=>reject(Error('Decode '+src));image.src=src;});
          return paths.length;
        """, arguments: ["paths": paths], in: nil, contentWorld: .page) as! Int
        XCTAssertEqual(loaded, paths.count)
    }
    func testNativeVerificationRecoveryAndAccountIsolation() async throws {
        let session = try SKTestSession(configurationFileNamed: "FortuneCarnival")
        session.resetToDefaultState(); session.clearTransactions(); session.disableDialogs = true
        let backend = StoreKitBackend(), token = UUID().uuidString
        let products = try await backend.handle("products", ["productIds": ["com.publisher.fortunecarnival.coins.purse.v3"]]) as! [[String: String]]
        XCTAssertEqual(products.count, 1)
        let tx = try await backend.handle("purchase", ["productId": "com.publisher.fortunecarnival.coins.purse.v3", "appAccountToken": token]) as! [String: Any]
        XCTAssertEqual(tx["status"] as? String, "verified")
        XCTAssertEqual((tx["appAccountToken"] as? String)?.lowercased(), token.lowercased())
        let id = try XCTUnwrap(tx["transactionId"] as? String)
        let restarted = StoreKitBackend()
        let wrong = try await restarted.handle("restore", ["appAccountToken": UUID().uuidString]) as! [[String: Any]]
        XCTAssertTrue(wrong.isEmpty)
        let unfinished = try await restarted.handle("restore", ["appAccountToken": token]) as! [[String: Any]]
        XCTAssertTrue(unfinished.contains { $0["transactionId"] as? String == id })
        _ = try await restarted.handle("finish", ["transactionId": id])
        let done = try await restarted.handle("restore", ["appAccountToken": token]) as! [[String: Any]]
        XCTAssertTrue(done.isEmpty)
    }
    func testPendingAndInvalidMessagesDoNotDeliver() async throws {
        let session = try SKTestSession(configurationFileNamed: "FortuneCarnival")
        session.resetToDefaultState(); session.clearTransactions(); session.disableDialogs = true; session.askToBuyEnabled = true
        defer { session.askToBuyEnabled = false }
        let backend = StoreKitBackend(), token = UUID().uuidString
        let pending = try await backend.handle("purchase", ["productId": "com.publisher.fortunecarnival.coins.purse.v3", "appAccountToken": token]) as! [String: Any]
        XCTAssertEqual(pending["status"] as? String, "pending")
        let unfinished = try await backend.handle("restore", ["appAccountToken": token]) as! [[String: Any]]
        XCTAssertTrue(unfinished.isEmpty)
        do { _ = try await backend.handle("finish", ["transactionId": "123456"]); XCTFail("Accepted unverified transaction") } catch {}
        do { _ = try await backend.handle("purchase", ["productId": "invalid", "appAccountToken": token]); XCTFail("Accepted unknown product") } catch {}
    }
    func testWebPurchaseAndDurableCoins() async throws {
        let session = try SKTestSession(configurationFileNamed: "FortuneCarnival")
        session.resetToDefaultState(); session.clearTransactions(); session.disableDialogs = true
        let view = try XCTUnwrap(UIApplication.shared.windows.first?.rootViewController?.view.subviews.compactMap { $0 as? WKWebView }.first)
        for _ in 0..<160 {
            if (try? await view.evaluateJavaScript("Boolean(window.System)")) as? Bool == true { break }
            try await Task.sleep(nanoseconds: 250_000_000)
        }
        let result = try await view.callAsyncJavaScript("""
          const cc=await System.import('cc');let app;for(let n=0;n<160;n++){app=cc.director.getScene()?.getComponentsInChildren(cc.Component).find(c=>c.root&&c.services&&c.services.auth&&c.services.store&&c.services.economy);if(app)break;await new Promise(r=>setTimeout(r,250));}if(!app)throw Error('Game component not ready');app.accept();const a=await app.services.auth.register({username:'iap'+Date.now().toString().slice(-10),nickname:'Store Tester',password:'LocalTest_2026',confirmPassword:'LocalTest_2026',acceptedTerms:true});if(!a.ok)throw Error(JSON.stringify(a));const before=app.services.economy.balance(),r=await app.services.store.purchase('purse'),after=app.services.economy.balance();await app.services.store.restore();const saved=app.services.save.read();return {ok:r.ok,before,after,afterRecovery:app.services.economy.balance(),persisted:saved.players[saved.currentUserId].credits};
        """, arguments: [:], in: nil, contentWorld: .page) as! [String: Any]
        XCTAssertEqual(result["ok"] as? Bool, true, "\(result)")
        XCTAssertEqual(result["after"] as? Int, (result["before"] as! Int) + 5000, "\(result)")
        XCTAssertEqual(result["afterRecovery"] as? Int, result["after"] as? Int, "\(result)")
        XCTAssertEqual(result["persisted"] as? Int, result["after"] as? Int, "\(result)")
    }
}

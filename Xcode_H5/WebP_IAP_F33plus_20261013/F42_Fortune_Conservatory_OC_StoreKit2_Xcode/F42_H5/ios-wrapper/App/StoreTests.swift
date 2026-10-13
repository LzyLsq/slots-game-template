import XCTest
import StoreKit
import StoreKitTest
import WebKit
@testable import FortuneConservatoryH5

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
        if true {
            let modulesLoaded = try await view.callAsyncJavaScript("""
              for (const [src, mime] of [['src/app.mjs', 'text/javascript'], ['src/local-iap.mjs', 'text/javascript'], ['manifest.webmanifest', 'application/manifest+json']]) {
                const response = await fetch(src);
                if (!response.ok || !response.headers.get('content-type')?.includes(mime)) throw Error('Module HTTP/MIME '+src);
              }
              return true;
            """, arguments: [:], in: nil, contentWorld: .page) as! Bool
            XCTAssertTrue(modulesLoaded)
        }
    }
    func testNativeVerificationRecoveryAndAccountIsolation() async throws {
        let session = try SKTestSession(configurationFileNamed: "FortuneConservatory")
        session.resetToDefaultState(); session.clearTransactions(); session.disableDialogs = true
        let backend = StoreKitBackend(), token = UUID().uuidString
        let products = try await backend.handle("products", ["productIds": ["com.publisher.fortuneconservatory.coins.purse.v1"]]) as! [[String: String]]
        XCTAssertEqual(products.count, 1)
        let tx = try await backend.handle("purchase", ["productId": "com.publisher.fortuneconservatory.coins.purse.v1", "appAccountToken": token]) as! [String: Any]
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
        let session = try SKTestSession(configurationFileNamed: "FortuneConservatory")
        session.resetToDefaultState(); session.clearTransactions(); session.disableDialogs = true; session.askToBuyEnabled = true
        defer { session.askToBuyEnabled = false }
        let backend = StoreKitBackend(), token = UUID().uuidString
        let pending = try await backend.handle("purchase", ["productId": "com.publisher.fortuneconservatory.coins.purse.v1", "appAccountToken": token]) as! [String: Any]
        XCTAssertEqual(pending["status"] as? String, "pending")
        let unfinished = try await backend.handle("restore", ["appAccountToken": token]) as! [[String: Any]]
        XCTAssertTrue(unfinished.isEmpty)
        do { _ = try await backend.handle("finish", ["transactionId": "123456"]); XCTFail("Accepted unverified transaction") } catch {}
        do { _ = try await backend.handle("purchase", ["productId": "invalid", "appAccountToken": token]); XCTFail("Accepted unknown product") } catch {}
    }
    func testWebPurchaseAndDurableCoins() async throws {
        let session = try SKTestSession(configurationFileNamed: "FortuneConservatory")
        session.resetToDefaultState(); session.clearTransactions(); session.disableDialogs = true
        let original = try XCTUnwrap(UIApplication.shared.windows.first?.rootViewController?.view.subviews.compactMap { $0 as? WKWebView }.first)
        var view = original
        var testBackend: StoreKitBackend?
        // SKTestSession resets transaction IDs. Custom games have one guest save,
        // so a previous test's ledger must not be reused or erased to pass a test.
        // Only the test gets a new *persistent* WebKit data store; real saves stay intact.
        if true {
            guard #available(iOS 17.0, *) else {
                throw XCTSkip("Isolated persistent WebKit test storage requires iOS 17. Production supports iOS 15.4.")
            }
            for _ in 0..<160 {
                if original.url?.scheme == "http" { break }
                try await Task.sleep(nanoseconds: 250_000_000)
            }
            let url = try XCTUnwrap(original.url)
            let configuration = WKWebViewConfiguration()
            configuration.websiteDataStore = WKWebsiteDataStore(forIdentifier: UUID())
            configuration.allowsInlineMediaPlayback = true
            configuration.mediaTypesRequiringUserActionForPlayback = []
            let backend = StoreKitBackend()
            backend.allowedOrigin = url
            backend.configure(configuration)
            view = WKWebView(frame: original.frame, configuration: configuration)
            backend.attach(view)
            testBackend = backend
            original.superview?.addSubview(view)
            view.load(URLRequest(url: url))
        }
        defer {
            if view !== original {
                view.stopLoading()
                view.configuration.userContentController.removeScriptMessageHandler(forName: "localStore", contentWorld: .page)
                view.removeFromSuperview()
            }
            withExtendedLifetime(testBackend) {}
        }
        for _ in 0..<160 {
            if (try? await view.evaluateJavaScript(#"location.protocol === 'http:' && (Boolean(document.querySelector('[data-action="enter"],[data-action="shop"]')))"#)) as? Bool == true { break }
            try await Task.sleep(nanoseconds: 250_000_000)
        }
        let result = try await view.callAsyncJavaScript("""
          for(let n=0;n<160&&!document.querySelector('[data-action="enter"],[data-action="shop"]');n++)await new Promise(r=>setTimeout(r,250));const consent=document.querySelector('#consent');if(consent){consent.checked=true;document.querySelector('[data-action="enter"]').click();}for(let n=0;n<160&&!document.querySelector('[data-action="shop"]');n++)await new Promise(r=>setTimeout(r,250));const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('f42-fortune-conservatory',1);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});const get=(s,k)=>new Promise((resolve,reject)=>{const r=db.transaction(s).objectStore(s).get(k);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});const read=async()=>get('profiles',await get('meta','active'));const before=(await read()).balance;document.querySelector('[data-action="shop"]').click();for(let n=0;n<160&&!document.querySelector('[data-pack="purse"]:not(:disabled)');n++)await new Promise(r=>setTimeout(r,250));const button=document.querySelector('[data-pack="purse"]:not(:disabled)');if(!button)throw Error('Store product unavailable');button.click();let saved;for(let n=0;n<160;n++){saved=await read();if(saved.balance!==before)break;await new Promise(r=>setTimeout(r,250));}const after=saved.balance;for(let n=0;n<160&&!document.querySelector('[data-action="sync-purchases"]');n++)await new Promise(r=>setTimeout(r,250));document.querySelector('[data-action="sync-purchases"]').click();await new Promise(r=>setTimeout(r,600));saved=await read();db.close();return {ok:after===before+2000,before,after,afterRecovery:saved.balance,persisted:saved.balance};
        """, arguments: [:], in: nil, contentWorld: .page) as! [String: Any]
        XCTAssertEqual(result["ok"] as? Bool, true, "\(result)")
        XCTAssertEqual(result["after"] as? Int, (result["before"] as! Int) + 2000, "\(result)")
        XCTAssertEqual(result["afterRecovery"] as? Int, result["after"] as? Int, "\(result)")
        XCTAssertEqual(result["persisted"] as? Int, result["after"] as? Int, "\(result)")
        _ = try await view.evaluateJavaScript("location.reload(); true")
        try await Task.sleep(nanoseconds: 2_000_000_000)
        let reopened = try await view.callAsyncJavaScript("""
          const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('f42-fortune-conservatory',1);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});const get=(s,k)=>new Promise((resolve,reject)=>{const r=db.transaction(s).objectStore(s).get(k);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});const read=async()=>get('profiles',await get('meta','active'));const saved=await read();db.close();return saved.balance;
        """, arguments: [:], in: nil, contentWorld: .page) as! Int
        XCTAssertEqual(reopened, result["after"] as? Int, "Coins must survive a real page reload")
    }
}

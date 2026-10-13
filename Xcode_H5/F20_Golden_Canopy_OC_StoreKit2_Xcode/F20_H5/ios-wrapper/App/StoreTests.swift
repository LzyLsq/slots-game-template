import XCTest
import StoreKit
import StoreKitTest
import WebKit
@testable import GoldenCanopyH5

@MainActor final class StoreTests: XCTestCase {
    func testObjectiveCAppleBridgeRejectsInvalidNonce() async throws {
        let view = try XCTUnwrap(UIApplication.shared.windows.first?.rootViewController?.view.subviews.compactMap { $0 as? WKWebView }.first)
        for _ in 0..<160 {
            if (try? await view.evaluateJavaScript("!!window.__AURELIA_APPLE_AUTH__")) as? Bool == true { break }
            try await Task.sleep(nanoseconds: 250_000_000)
        }
        let result = try await view.callAsyncJavaScript("""
          const available=await window.__AURELIA_APPLE_AUTH__.isAvailable();
          let rejected=false;
          try { await window.__AURELIA_APPLE_AUTH__.authorize('short'); }
          catch(e) { rejected=String(e).includes('Invalid authorization request'); }
          return {available,rejected};
        """, arguments: [:], in: nil, contentWorld: .page) as! [String: Bool]
        XCTAssertEqual(result["available"], true)
        XCTAssertEqual(result["rejected"], true)
    }
    func testAllBundledWebImagesDecode() async throws {
        let view = try XCTUnwrap(UIApplication.shared.windows.first?.rootViewController?.view.subviews.compactMap { $0 as? WKWebView }.first)
        for _ in 0..<160 {
            if (try? await view.evaluateJavaScript("!!window.__AURELIA_IAP__")) as? Bool == true { break }
            try await Task.sleep(nanoseconds: 250_000_000)
        }
        let root = Bundle.main.resourceURL!.appendingPathComponent("web")
        let paths = FileManager.default.enumerator(at: root, includingPropertiesForKeys: nil)!.compactMap { $0 as? URL }.filter { $0.pathExtension == "webp" }.map { String($0.path.dropFirst(root.path.count)) }
        XCTAssertEqual(paths.count, 58)
        let result = try await view.callAsyncJavaScript("""
          const failed=[];
          for (const path of paths) {
            const ok=await new Promise(resolve=>{const image=new Image();const timeout=setTimeout(()=>resolve(false),15000);image.onload=()=>{clearTimeout(timeout);resolve(image.naturalWidth>0&&image.naturalHeight>0)};image.onerror=()=>{clearTimeout(timeout);resolve(false)};image.src=path;});
            if(!ok)failed.push(path);
          }
          return failed;
        """, arguments: ["paths": paths], in: nil, contentWorld: .page) as! [String]
        XCTAssertTrue(result.isEmpty, "Images failed: \(result)")
        print("F20_IMAGE_CHECK total=\(paths.count) failed=\(result.count)")
        let cocos = try await view.callAsyncJavaScript("""
          const cc=await System.import('cc');
          return await new Promise((resolve,reject)=>{
            const timer=setTimeout(()=>reject(Error('Cocos image loading timed out')),30000);
            cc.resources.loadDir('',cc.ImageAsset,(err,items)=>{
              clearTimeout(timer);
              if(err){reject(Error(err.message));return;}
              resolve({count:items.length,invalid:items.filter(i=>!i.width||!i.height).map(i=>i.name)});
            });
          });
        """, arguments: [:], in: nil, contentWorld: .page) as! [String: Any]
        XCTAssertEqual(cocos["count"] as? Int, 55)
        XCTAssertEqual((cocos["invalid"] as? [String])?.count, 0, "\(cocos)")
    }
    func testWebBridgePurchaseAndPersistentBalance() async throws {
        let session = try SKTestSession(configurationFileNamed: "GoldenCanopy")
        session.resetToDefaultState(); session.clearTransactions(); session.disableDialogs = true
        let view = try XCTUnwrap(UIApplication.shared.windows.first?.rootViewController?.view.subviews.compactMap { $0 as? WKWebView }.first)
        for _ in 0..<160 {
            if (try? await view.evaluateJavaScript("!!window.__AURELIA_APP_READY__")) as? Bool == true { break }
            // Older entry templates signal readiness by removing the loader instead.
            if (try? await view.evaluateJavaScript("!document.getElementById('csw-preloader') && !!window.System")) as? Bool == true { break }
            try await Task.sleep(nanoseconds: 250_000_000)
        }
        let result = try await view.callAsyncJavaScript("""
          const cc = await System.import('cc');
          const app = cc.director.getScene().getComponentsInChildren(cc.Component).find(c => c.services && c.art && c.page);
          app.accept();
          const name = 'iap' + Date.now().toString().slice(-10);
          const r = await app.services.auth.register({username:name,nickname:'Store Tester',password:'LocalTest_2026',confirmPassword:'LocalTest_2026',acceptedTerms:true});
          if (!r.ok) throw Error(r.message);
          const before = app.services.economy.balance();
          let diagnostic='';
          try { await window.__AURELIA_IAP__.products(['com.publisher.goldencanopy.coins.purse']); } catch(e) { diagnostic=String(e); }
          const purchase = await app.services.store.purchase('purse');
          const after = app.services.economy.balance();
          const recovery = await app.services.store.restore();
          app.page='home'; app.render();
          if(!purchase.ok)try{const p=app.services.profile.current();const list=await window.__AURELIA_IAP__.restore(p.appAccountToken);diagnostic+=JSON.stringify(list);if(list.length)try{await app.services.store.deliver(list[0],app.services.save.read().currentUserId,p.appAccountToken);}catch(e){diagnostic+=' delivery: '+String(e);}}catch(e){diagnostic+=' '+String(e);}
          return {ok:purchase.ok,message:purchase.message,diagnostic,before,after,afterRecovery:app.services.economy.balance(),recovery:recovery.ok};
        """, arguments: [:], in: nil, contentWorld: .page) as! [String: Any]
        XCTAssertEqual(result["ok"] as? Bool, true, "\(result)")
        XCTAssertEqual((result["after"] as? Int), (result["before"] as! Int) + 10000)
        XCTAssertEqual(result["afterRecovery"] as? Int, result["after"] as? Int)
    }
    func testVerifiedLocalPurchaseAndRecovery() async throws {
        let session = try SKTestSession(configurationFileNamed: "GoldenCanopy")
        session.resetToDefaultState()
        session.clearTransactions()
        session.disableDialogs = true
        let store = StoreKitBackend()
        let token = UUID().uuidString
        let id = "com.publisher.goldencanopy.coins.purse"
        let products = try await store.handle("products", ["productIds": [id]]) as! [[String: String]]
        XCTAssertEqual(products.count, 1)
        let result = try await store.handle("purchase", ["productId": id, "appAccountToken": token]) as! [String: Any]
        XCTAssertEqual(result["status"] as? String, "verified")
        XCTAssertEqual((result["appAccountToken"] as? String)?.lowercased(), token.lowercased())
        let tx = try XCTUnwrap(result["transactionId"] as? String)
        // Simulate terminating after payment but before durable web delivery.
        let reopened = StoreKitBackend()
        let pending = try await reopened.handle("restore", ["appAccountToken": token]) as! [[String: Any]]
        XCTAssertTrue(pending.contains { $0["transactionId"] as? String == tx })
        let wrongAccount = try await reopened.handle("restore", ["appAccountToken": UUID().uuidString]) as! [[String: Any]]
        XCTAssertTrue(wrongAccount.isEmpty)
        _ = try await reopened.handle("finish", ["transactionId": tx])
        let finished = try await reopened.handle("restore", ["appAccountToken": token]) as! [[String: Any]]
        XCTAssertTrue(finished.isEmpty)
    }

    func testPendingApprovalDoesNotDeliver() async throws {
        let session = try SKTestSession(configurationFileNamed: "GoldenCanopy")
        session.resetToDefaultState(); session.clearTransactions()
        session.disableDialogs = true
        session.askToBuyEnabled = true
        let store = StoreKitBackend(), token = UUID().uuidString
        let result = try await store.handle("purchase", ["productId": "com.publisher.goldencanopy.coins.purse", "appAccountToken": token]) as! [String: Any]
        XCTAssertEqual(result["status"] as? String, "pending")
        let pending = try await store.handle("restore", ["appAccountToken": token]) as! [[String: Any]]
        XCTAssertTrue(pending.isEmpty)
        session.askToBuyEnabled = false
    }

    func testRejectUnknownProductAndFinish() async throws {
        let store = StoreKitBackend()
        do { _ = try await store.handle("finish", ["transactionId": "fake-id"]); XCTFail("Unverified transaction accepted") } catch {}
        do { _ = try await store.handle("purchase", ["productId": "fake-product", "appAccountToken": UUID().uuidString]); XCTFail("Unknown product accepted") } catch {}
    }
}

import UIKit
import WebKit
import UniformTypeIdentifiers

@main
final class AppDelegate: UIResponder, UIApplicationDelegate {
    var window: UIWindow?
    func application(_ application: UIApplication, didFinishLaunchingWithOptions options: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        let window = UIWindow(frame: UIScreen.main.bounds)
        window.rootViewController = GameViewController()
        window.makeKeyAndVisible()
        self.window = window
        return true
    }
}

/// Serves only bundled resources. No remote server, ATS exceptions, or private WebKit APIs.
final class BundleSchemeHandler: NSObject, WKURLSchemeHandler {
    func webView(_ webView: WKWebView, start task: WKURLSchemeTask) {
        guard let url = task.request.url, url.host == "game",
              let root = Bundle.main.url(forResource: "Web", withExtension: nil) else {
            task.didFailWithError(URLError(.badURL)); return
        }
        let relative = url.path == "/" ? "index.html" : String(url.path.dropFirst())
        let file = root.appendingPathComponent(relative).standardizedFileURL
        guard file.path.hasPrefix(root.standardizedFileURL.path + "/"),
              let data = try? Data(contentsOf: file) else {
            task.didFailWithError(URLError(.fileDoesNotExist)); return
        }
        let mime = file.pathExtension == "js" ? "application/javascript" :
            (UTType(filenameExtension: file.pathExtension)?.preferredMIMEType ?? "application/octet-stream")
        task.didReceive(URLResponse(url: url, mimeType: mime, expectedContentLength: data.count, textEncodingName: ["html", "css", "js", "json"].contains(file.pathExtension) ? "utf-8" : nil))
        task.didReceive(data)
        task.didFinish()
    }
    func webView(_ webView: WKWebView, stop task: WKURLSchemeTask) {}
}

final class GameViewController: UIViewController, WKNavigationDelegate {
    private var webView: WKWebView!
    private let status = UILabel()
    override var preferredStatusBarStyle: UIStatusBarStyle { .lightContent }
    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor(red: 0.03, green: 0.17, blue: 0.20, alpha: 1)
        let configuration = WKWebViewConfiguration()
        configuration.setURLSchemeHandler(BundleSchemeHandler(), forURLScheme: "fortune")
        configuration.websiteDataStore = .default()
        configuration.userContentController.addScriptMessageHandler(StoreCatalogBridge(), contentWorld: .page, name: "fortuneStore")
        configuration.userContentController.addScriptMessageHandler(AppleSignInBridge(presenter: self), contentWorld: .page, name: "fortuneApple")
        configuration.allowsInlineMediaPlayback = true
        let bridge = """
        (() => {
          let inactive = false;
          Object.defineProperty(document, 'hidden', { configurable: true, get: () => inactive });
          Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => inactive ? 'hidden' : 'visible' });
          window.__fortuneNativeLifecycle = state => {
            inactive = state !== 'active';
            document.dispatchEvent(new Event('visibilitychange'));
            window.dispatchEvent(new CustomEvent('fortune:lifecycle', {detail:{state}}));
          };
        })();
        """
        configuration.userContentController.addUserScript(WKUserScript(source: bridge, injectionTime: .atDocumentStart, forMainFrameOnly: true))
        webView = WKWebView(frame: .zero, configuration: configuration)
        webView.navigationDelegate = self
        webView.isOpaque = false
        webView.backgroundColor = view.backgroundColor
        webView.scrollView.bounces = false
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(webView)
        NSLayoutConstraint.activate([
            webView.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            webView.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor),
            webView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            webView.trailingAnchor.constraint(equalTo: view.trailingAnchor)
        ])
        status.text = "Loading Fortune Tides…"
        status.textColor = .white
        status.textAlignment = .center
        status.numberOfLines = 0
        status.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(status)
        NSLayoutConstraint.activate([status.centerXAnchor.constraint(equalTo: view.centerXAnchor), status.centerYAnchor.constraint(equalTo: view.centerYAnchor), status.widthAnchor.constraint(lessThanOrEqualTo: view.widthAnchor, multiplier: 0.9)])
        NotificationCenter.default.addObserver(self, selector: #selector(inactive), name: UIApplication.willResignActiveNotification, object: nil)
        NotificationCenter.default.addObserver(self, selector: #selector(active), name: UIApplication.didBecomeActiveNotification, object: nil)
        loadGame()
    }
    deinit { NotificationCenter.default.removeObserver(self) }
    private func loadGame() {
        var address = "fortune://game/index.html"
        #if DEBUG
        if ProcessInfo.processInfo.arguments.contains(where: { $0.hasPrefix("--native-") }) { address += "?debug=1" }
        #endif
        webView.load(URLRequest(url: URL(string: address)!))
    }
    @objc private func inactive() {
        webView.evaluateJavaScript("window.__fortuneNativeLifecycle?.('inactive')")
        webView.setAllMediaPlaybackSuspended(true)
        recordLifecycleState("inactive")
    }
    @objc private func active() {
        webView.evaluateJavaScript("window.__fortuneNativeLifecycle?.('active')")
        webView.setAllMediaPlaybackSuspended(false)
        recordLifecycleState("active")
    }
    private func recordLifecycleState(_ state: String) {
        #if DEBUG
        webView.evaluateJavaScript("JSON.stringify({state:'\(state)',hidden:document.hidden,busy:window.f26?.busy,coins:window.f26?.store.state.coins,spins:window.f26?.store.state.spins,page:document.querySelector('#app')?.className})") { value, error in
            NSLog("F26_LIFECYCLE %@ %@", String(describing: value), String(describing: error))
        }
        #endif
    }
    func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        guard let url = action.request.url else { decisionHandler(.cancel); return }
        decisionHandler(url.scheme == "fortune" && url.host == "game" ? .allow : .cancel)
    }
    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        status.isHidden = true
        #if DEBUG
        DispatchQueue.main.asyncAfter(deadline: .now() + 3) { [weak self] in
            self?.webView.evaluateJavaScript("JSON.stringify({title:document.title,buttons:document.querySelectorAll('button').length,text:document.body.innerText.slice(0,400),images:[...document.images].filter(i=>!i.complete||!i.naturalWidth).map(i=>i.src)})") { result, error in
                NSLog("F26_WEB_SMOKE %@ %@", String(describing: result), String(describing: error))
                if ProcessInfo.processInfo.arguments.contains("--native-smoke") { self?.runGameplaySmoke() }
                if ProcessInfo.processInfo.arguments.contains("--native-verify") { self?.verifyPersistedSmoke() }
                if ProcessInfo.processInfo.arguments.contains("--native-background") {
                    self?.webView.evaluateJavaScript("f26.navigate('game','mint'); f26.spinRound(); JSON.stringify({busy:f26.busy,coins:f26.store.state.coins,spins:f26.store.state.spins})") { value, error in
                        NSLog("F26_BACKGROUND_READY %@ %@", String(describing: value), String(describing: error))
                    }
                }
                let args = ProcessInfo.processInfo.arguments
                if let index = args.firstIndex(of: "--native-capture"), args.indices.contains(index + 1), ["mint", "pearl", "reef", "beacon"].contains(args[index + 1]) {
                    self?.webView.evaluateJavaScript("window.f26.navigate('game','\(args[index + 1])')")
                }
            }
        }
        #endif
    }
    #if DEBUG
    // Call the public Objective-C completion API directly. Xcode 26's Swift
    // overlay adds a libswiftWebKit dependency absent from older simulators.
    private func callSmokeScript(_ script: String, completion: @escaping (Any?, Error?) -> Void) {
        let invoke = webView.__callAsyncJavaScript
        invoke(script, [:], nil, .page, completion)
    }
    private func verifyPersistedSmoke() {
        let script = """
        const expected = JSON.parse(localStorage.getItem('f26-native-expected'));
        if (!expected || expected.coins !== f26.store.state.coins || expected.spins !== f26.store.state.spins) throw new Error('saved wallet changed across process restart');
        return JSON.stringify({passed:true,expected,actual:{coins:f26.store.state.coins,spins:f26.store.state.spins}});
        """
        callSmokeScript(script) { value, error in
            let result: Result<Any, Error> = error.map { .failure($0) } ?? .success(value ?? "null")
            NSLog("F26_PERSISTENCE_SMOKE %@", String(describing: result))
        }
    }
    private func runGameplaySmoke() {
        let script = """
        const assert = (condition, reason) => { if (!condition) throw new Error(reason); };
        assert(!!window.f26, 'debug boot missing');
        const results = [];
        const originalMotion = f26.store.state.reducedMotion;
        f26.store.state.reducedMotion = true;
        const before = f26.store.state.spins;
        for (const mode of ['mint','pearl','reef','beacon']) {
          f26.navigate('game', mode);
          assert(!!document.querySelector('canvas'), 'missing reels '+mode);
          document.querySelector('[data-action="bet-picker"]').click();
          const bets = [...document.querySelectorAll('[data-action="bet-select"]')];
          assert(bets.length === 5 && bets.every(b => b.getBoundingClientRect().height >= 44), 'bet options missing or too small');
          document.querySelector('[data-action="bet-select"][data-value="200"]').click();
          assert(document.querySelector('#bet-value').textContent === '200', 'bet selection failed');
          assert(!document.querySelector('[role="dialog"]'), 'bet dialog not dismissed');
          await f26.spinRound();
          assert(!f26.busy, 'spin stuck '+mode);
          assert(Number.isFinite(f26.store.state.coins), 'invalid wallet');
          results.push({mode, balance:f26.store.state.coins});
          document.querySelector('.game-header [data-page="home"]').click();
          assert(document.querySelectorAll('[data-game]').length === 4, 'home navigation failed '+mode);
        }
        assert(f26.store.state.spins === before + 4, 'spins not recorded');
        localStorage.setItem('f26-native-smoke', 'ok');
        assert(localStorage.getItem('f26-native-smoke') === 'ok', 'storage failed');
        localStorage.removeItem('f26-native-smoke');
        const status = await webkit.messageHandlers.fortuneStore.postMessage({action:'status'});
        const products = await webkit.messageHandlers.fortuneStore.postMessage({action:'products'});
        assert(status.purchasesEnabled === false, 'unexpected purchase capability');
        f26.store.state.reducedMotion = originalMotion;
        f26.navigate('home');
        localStorage.setItem('f26-native-expected', JSON.stringify({coins:f26.store.state.coins,spins:f26.store.state.spins}));
        return JSON.stringify({passed:true,results,status,products});
        """
        callSmokeScript(script) { value, error in
            let result: Result<Any, Error> = error.map { .failure($0) } ?? .success(value ?? "null")
            NSLog("F26_GAMEPLAY_SMOKE %@", String(describing: result))
        }
    }
    #endif
    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) { showError(error) }
    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) { showError(error) }
    private func showError(_ error: Error) {
        status.isHidden = false
        status.text = "Unable to load the bundled game. Please reopen the app."
        NSLog("F26_LOAD_ERROR %@", error.localizedDescription)
    }
    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) { loadGame() }
}

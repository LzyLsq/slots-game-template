const bridge = () => globalThis.__AURELIA_IAP__;
const fail = (message, status = 'failed') => ({ ok: false, status, credited: 0, message });
export function deviceAccount(storage, prefix, id) {
    const key = prefix + '.iap-account.' + id;
    let token = storage.getItem(key);
    if (!token || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)) {
        const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
        bytes[6] = (bytes[6] & 15) | 64;
        bytes[8] = (bytes[8] & 63) | 128;
        const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
        token = [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)].join('-');
        storage.setItem(key, token);
    }
    return { id, token };
}
export class LocalCoinStore {
    products;
    all;
    account;
    grant;
    busy = false;
    constructor(products, all, account, grant) {
        this.products = products;
        this.all = all;
        this.account = account;
        this.grant = grant;
        globalThis.addEventListener?.('local-store-update', () => { void this.restore(); });
    }
    async catalog() {
        const native = bridge();
        let prices = [];
        if (native)
            try {
                await this.restore();
                prices = await native.products(this.products.map(p => p.appleProductId));
            }
            catch { }
        return this.products.map(p => ({ ...p, available: prices.some(n => n.productId === p.appleProductId), displayPrice: prices.find(n => n.productId === p.appleProductId)?.displayPrice ?? 'UNAVAILABLE' }));
    }
    async deliver(tx, account) {
        const p = this.all.find(p => p.appleProductId === tx.productId), now = this.account();
        if (tx.status !== 'verified')
            return fail(tx.status === 'cancelled' ? 'Purchase cancelled.' : tx.status === 'pending' ? 'Awaiting approval. No coins delivered.' : 'Purchase verification failed.', tx.status === 'cancelled' ? 'cancelled' : tx.status === 'pending' ? 'pending' : 'failed');
        if (!p || !tx.transactionId || !/^\d{1,40}$/.test(tx.transactionId) || !tx.appAccountToken || tx.appAccountToken.toLowerCase() !== account.token.toLowerCase() || now?.id !== account.id || now.token.toLowerCase() !== account.token.toLowerCase())
            return fail('Verified purchase does not match the current account.');
        const delivery = this.grant(tx.transactionId, p.credits + p.bonus);
        // The account save and transaction ID must be committed together before finish().
        let finished = true;
        try {
            await bridge().finish(tx.transactionId);
        }
        catch {
            finished = false;
        }
        return { ok: true, status: delivery === 'duplicate' ? 'duplicate' : 'verified', credited: delivery === 'new' ? p.credits + p.bonus : 0, message: finished ? (delivery === 'new' ? 'Purchase verified and coins delivered.' : 'This purchase was already delivered.') : 'Coins saved. Transaction confirmation will retry.' };
    }
    async purchase(id) {
        if (this.busy)
            return fail('Another purchase is processing.', 'pending');
        const native = bridge(), p = this.products.find(p => p.id === id);
        if (!native || !p)
            return fail('Apple purchases are available only inside the iOS app.', 'unavailable');
        this.busy = true;
        try {
            const a = this.account();
            if (!a)
                return fail('Sign in to purchase virtual coins.', 'unavailable');
            return await this.deliver(await native.purchase(p.appleProductId, a.token), a);
        }
        catch {
            return fail('Payment or local save failed. No unverified coins were granted; unfinished purchases can be retried.');
        }
        finally {
            this.busy = false;
        }
    }
    async restore() {
        if (this.busy)
            return fail('Another purchase is processing.', 'pending');
        const native = bridge();
        if (!native)
            return fail('Apple purchases are available only inside the iOS app.', 'unavailable');
        this.busy = true;
        try {
            const a = this.account();
            if (!a)
                return fail('Sign in to recover unfinished purchases.', 'unavailable');
            let credited = 0;
            for (const tx of await native.restore(a.token)) {
                const r = await this.deliver(tx, a);
                if (!r.ok)
                    return r;
                credited += r.credited;
            }
            return { ok: true, status: 'verified', credited, message: credited ? 'Unfinished purchases delivered.' : 'No unfinished purchases. Consumed coins cannot be restored.' };
        }
        catch {
            return fail('Unable to recover purchases. Try again.');
        }
        finally {
            this.busy = false;
        }
    }
}

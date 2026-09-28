# F32 玩法与经济

当前实际结算以 `assets/scripts/math/IndependentCore.ts` 和 `CabinetProfiles.ts` 为准，不沿用前作的森林玩法。

1. **COINWORKS PRESS**：5×3，243 Ways，自最左列连续匹配；WILD 印模在原轴上升最多三步，仅支付新增奖额。
2. **LANTERN LEDGER**：6×5，至少五格正交相连的同符号组；中奖格转为 WILD，按新增奖额结算。
3. **CLOUD CONVEYOR**：6×5，同种符号全盘计数至少八枚，不需相连；三枚 SCATTER 触发五次免费旋转，每次最多三次落料；不可重复触发。
4. **JUBILEE VAULT**：5×3，25 条固定赔付线；中奖格消除后同列落下补充，最多四轮，倍率 1×/2×/4×/8×。

基础奖和特色奖受单轮上限约束；旋转结果在演出前确定，演出不再次发币。虚拟金币经济参数见 `EconomyProfile.ts`，正式商品及历史收据映射见 `StoreService.ts`。开发样本位于 `docs/primary-gameplay-v4.json` 和 `docs/cabinet-validation-v3.json`，不能当作经认证 RTP；变更确定性种子后须重新采样。

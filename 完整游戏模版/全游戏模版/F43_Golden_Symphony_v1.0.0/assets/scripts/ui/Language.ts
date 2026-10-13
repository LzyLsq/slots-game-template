import {SYMPHONY_LOCALE} from './SymphonyLocale';
import {FESTIVAL_LOCALE} from './FestivalLocale';
import {UI_LOCALE_ADDITIONS} from './UiLocaleAdditions';
import {CLOCKWORK_LOCALE} from './ClockworkLocale';
import {PRIMARY_TRANSLATIONS} from './PrimaryTranslations';
import {CABINET_TRANSLATIONS} from './CabinetTranslations';
export const LANGUAGES = [{code:'en',name:'English'},{code:'zh-CN',name:'简体中文'},{code:'zh-TW',name:'繁體中文'},{code:'ja',name:'日本語'},{code:'ko',name:'한국어'}] as const;
export type Language = typeof LANGUAGES[number]['code'];
export const LANGUAGE_KEY='golden-symphony-f43.locale.v1';
export function resolveLanguage(value:string):Language {if(/^zh/i.test(value))return /TW|HK|Hant/i.test(value)?'zh-TW':'zh-CN';if(/^ja/i.test(value))return 'ja';if(/^ko/i.test(value))return 'ko';return 'en';}
type LocaleStorage=Pick<Storage,'getItem'|'setItem'>;
let storage:LocaleStorage|undefined;
try{storage=globalThis.localStorage;}catch{}
let selected:Language='en';
export function initializeLanguage(deviceStorage:LocaleStorage):void {storage=deviceStorage;try{selected=resolveLanguage(storage.getItem(LANGUAGE_KEY)||'en');}catch{selected='en';}}
try{selected=resolveLanguage(globalThis.localStorage?.getItem(LANGUAGE_KEY)||'en');}catch{}
export function language():Language{return selected;}
export function setLanguage(value:Language):void {selected=LANGUAGES.some(l=>l.code===value)?value:'en';try{storage?.setItem(LANGUAGE_KEY,selected);}catch{}}
export const translations:Record<string,readonly string[]> = {
  "COLLECT": ["领取", "領取", "受取", "받기"],
"CANOPY GROWTH":["金树生长", "金树生长", "CANOPY GROWTH", "CANOPY GROWTH"],"A central WILD or 3+ crowns plant a seed.":["中央出现百搭，或出现至少3个王冠，种下金树。", "中央出现百搭，或出现至少3个王冠，种下金树。", "A central WILD or 3+ crowns plant a seed.", "A central WILD or 3+ crowns plant a seed."],"The centre becomes WILD. One random neighbouring cell grows into WILD on each of three steps; earlier growth stays.":["中央变为百搭。每步随机向一个上下左右邻格生长，已长出的百搭保留，共生长3步。", "中央变为百搭。每步随机向一个上下左右邻格生长，已长出的百搭保留，共生长3步。", "The centre becomes WILD. One random neighbouring cell grows into WILD on each of three steps; earlier growth stays.", "The centre becomes WILD. One random neighbouring cell grows into WILD on each of three steps; earlier growth stays."],"Each growth step pays line, ways or group awards. Growth only touches orthogonal neighbours. Scatter awards and retriggers are excluded.":["每步结算一次线奖、路奖或连块奖。不斜向生长，不结算散布奖，不重复触发。", "每步结算一次线奖、路奖或连块奖。不斜向生长，不结算散布奖，不重复触发。", "Each growth step pays line, ways or group awards. Growth only touches orthogonal neighbours. Scatter awards and retriggers are excluded.", "Each growth step pays line, ways or group awards. Growth only touches orthogonal neighbours. Scatter awards and retriggers are excluded."],"COLLECTING CARGO":["逐站收货", "逐站收货", "COLLECTING CARGO", "COLLECTING CARGO"],"DELIVERY COMPLETE":["抵达交货", "抵达交货", "DELIVERY COMPLETE", "DELIVERY COMPLETE"],"EXPRESS STOP":["列车到站", "列车到站", "EXPRESS STOP", "EXPRESS STOP"],"COLLECTING GOLD":["宝库集金", "宝库集金", "COLLECTING GOLD", "COLLECTING GOLD"],"VAULT TOTAL":["宝库结算", "宝库结算", "VAULT TOTAL", "VAULT TOTAL"],"JUBILEE ENCORE":["庆典加演", "庆典加演", "JUBILEE ENCORE", "JUBILEE ENCORE"],"CELESTIAL UPGRADE":["财神点化", "财神点化", "CELESTIAL UPGRADE", "CELESTIAL UPGRADE"],"RECIPE COMPLETE":["配方完成", "配方完成", "RECIPE COMPLETE", "RECIPE COMPLETE"],"FORGE REFILL":["炼金补充", "炼金补充", "FORGE REFILL", "FORGE REFILL"],"DAILY CHEST":["每日宝箱", "每日宝箱", "DAILY CHEST", "DAILY CHEST"],
  "Language": [
    "语言",
    "語言",
    "言語",
    "언어"
  ],
  "Choose language": [
    "选择语言",
    "選擇語言",
    "言語を選択",
    "언어 선택"
  ],
  "Saved on this device": [
    "已保存到此设备",
    "已儲存到此裝置",
    "この端末に保存されます",
    "이 기기에 저장됩니다"
  ],
  "Language saved.": [
    "语言已保存。",
    "語言已儲存。",
    "言語を保存しました。",
    "언어가 저장되었습니다."
  ],
  "Boutique": [
    "商店",
    "商店",
    "ショップ",
    "상점"
  ],
  "Rewards": [
    "奖励",
    "獎勵",
    "報酬",
    "보상"
  ],
  "Canopy": [
    "大厅",
    "大廳",
    "ロビー",
    "로비"
  ],
  "Honours": [
    "排行",
    "排行",
    "ランキング",
    "순위"
  ],
  "Account": [
    "账户",
    "帳戶",
    "アカウント",
    "계정"
  ],
  "Terms": [
    "条款",
    "條款",
    "規約",
    "약관"
  ],
  "Privacy": [
    "隐私",
    "隱私",
    "プライバシー",
    "개인정보"
  ],
  "Support": [
    "帮助",
    "說明",
    "サポート",
    "도움말"
  ],
  "WELCOME, EXPLORER": [
    "欢迎来到金叶福庭",
    "歡迎來到金葉福庭",
    "ようこそ、冒険者",
    "모험가님, 환영합니다"
  ],
  "Sign in to your world of gold": [
    "登录，开启财富之旅",
    "登入，開啟財富之旅",
    "ログインして黄金の世界へ",
    "로그인하고 황금 세계로"
  ],
  "JOIN GOLDEN CANOPY": [
    "加入金叶福庭",
    "加入金葉福庭",
    "黄金の庭へようこそ",
    "황금 정원에 가입하세요"
  ],
  "Your woodland story starts here": [
    "你的林间故事由此开始",
    "你的林間故事由此開始",
    "森の物語がここから始まります",
    "숲속 이야기가 시작됩니다"
  ],
  "Username": [
    "用户名",
    "使用者名稱",
    "ユーザー名",
    "사용자 이름"
  ],
  "Password · 10–72 characters": [
    "密码 · 10–72 个字符",
    "密碼 · 10–72 個字元",
    "パスワード · 10～72文字",
    "비밀번호 · 10~72자"
  ],
  "Confirm password": [
    "确认密码",
    "確認密碼",
    "パスワードの確認",
    "비밀번호 확인"
  ],
  "Nickname": [
    "昵称",
    "暱稱",
    "ニックネーム",
    "닉네임"
  ],
  "SIGN IN": [
    "登录",
    "登入",
    "ログイン",
    "로그인"
  ],
  "Sign in with Apple": [
    "通过 Apple 登录",
    "透過 Apple 登入",
    "Appleでサインイン",
    "Apple로 로그인"
  ],
  "Guest play": [
    "游客体验",
    "訪客體驗",
    "ゲストプレイ",
    "게스트 플레이"
  ],
  "Register": [
    "注册",
    "註冊",
    "新規登録",
    "가입"
  ],
  "CREATE ACCOUNT": [
    "创建账户",
    "建立帳戶",
    "アカウント作成",
    "계정 만들기"
  ],
  "Back to sign in": [
    "返回登录",
    "返回登入",
    "ログインに戻る",
    "로그인으로 돌아가기"
  ],
  "I meet the age requirement and accept the Terms and Privacy Policy.": [
    "我已达到年龄要求，并同意条款与隐私政策。",
    "我已達到年齡要求，並同意條款與隱私政策。",
    "年齢条件を満たし、規約とプライバシーポリシーに同意します。",
    "연령 요건을 충족하며 약관과 개인정보 처리방침에 동의합니다."
  ],
  "Virtual coins · No cash prizes · Eligible adults only": [
    "虚拟金币 · 无现金奖励 · 仅限符合条件的成年人",
    "虛擬金幣 · 無現金獎勵 · 僅限符合條件的成年人",
    "仮想コイン · 換金不可 · 対象年齢の成人専用",
    "가상 코인 · 현금 보상 없음 · 이용 가능한 성인 전용"
  ],
  "YOUR WOODLAND PASSPORT": [
    "我的林间护照",
    "我的林間護照",
    "森のパスポート",
    "나의 숲속 여권"
  ],
  "GUEST EXPLORER": [
    "游客探险家",
    "訪客探險家",
    "ゲスト冒険者",
    "게스트 모험가"
  ],
  "CANOPY MEMBER": [
    "金叶会员",
    "金葉會員",
    "黄金の庭メンバー",
    "황금 정원 회원"
  ],
  "TOTAL WON": [
    "累计获奖",
    "累計獲獎",
    "累計獲得",
    "누적 획득"
  ],
  "TOP WIN": [
    "最高获奖",
    "最高獲獎",
    "最高獲得",
    "최고 획득"
  ],
  "Choose portrait": [
    "选择头像",
    "選擇頭像",
    "アバター選択",
    "아바타 선택"
  ],
  "Coin ledger": [
    "金币账本",
    "金幣帳本",
    "コイン履歴",
    "코인 내역"
  ],
  "Privacy & help": [
    "隐私与帮助",
    "隱私與說明",
    "プライバシーとヘルプ",
    "개인정보 및 도움말"
  ],
  "Sign out": [
    "退出登录",
    "登出",
    "ログアウト",
    "로그아웃"
  ],
  "Delete account": [
    "删除账户",
    "刪除帳戶",
    "アカウント削除",
    "계정 삭제"
  ],
  "Choose your portrait": [
    "选择你的头像",
    "選擇你的頭像",
    "アバターを選択",
    "아바타를 선택하세요"
  ],
  "Portrait saved to your account.": [
    "头像已保存。",
    "頭像已儲存。",
    "アバターを保存しました。",
    "아바타가 저장되었습니다."
  ],
  "Portrait could not be saved.": [
    "头像保存失败。",
    "頭像儲存失敗。",
    "アバターを保存できませんでした。",
    "아바타를 저장하지 못했습니다."
  ],
  "Portrait could not be saved. Please try again.": [
    "头像保存失败，请重试。",
    "頭像儲存失敗，請重試。",
    "保存できませんでした。再試行してください。",
    "저장하지 못했습니다. 다시 시도하세요."
  ],
  "Your coin ledger": [
    "我的金币账本",
    "我的金幣帳本",
    "コイン履歴",
    "나의 코인 내역"
  ],
  "Your coin ledger is ready": [
    "金币账本已就绪",
    "金幣帳本已就緒",
    "コイン履歴はここに表示されます",
    "코인 내역이 준비되었습니다"
  ],
  "Collect a reward or play a round. Your coin activity will appear here.": [
    "领取奖励或进行一局游戏，金币收支将显示在这里。",
    "領取獎勵或進行一局遊戲，金幣收支將顯示在這裡。",
    "報酬の受取やプレイによるコインの増減を表示します。",
    "보상을 받거나 게임을 플레이하면 코인 내역이 표시됩니다."
  ],
  "Explore rewards": [
    "查看奖励",
    "查看獎勵",
    "報酬を見る",
    "보상 보기"
  ],
  "Delete account & data": [
    "删除账户与数据",
    "刪除帳戶與資料",
    "アカウントとデータの削除",
    "계정 및 데이터 삭제"
  ],
  "This permanently deletes your account, progress and unused coins. This action cannot be undone.": [
    "此操作将永久删除账户、进度和剩余金币，无法撤销。",
    "此操作將永久刪除帳戶、進度和剩餘金幣，無法復原。",
    "アカウント、進行状況、未使用コインを完全に削除します。元に戻せません。",
    "계정, 진행 상황, 남은 코인이 영구 삭제됩니다. 되돌릴 수 없습니다."
  ],
  "Password (not needed for guest)": [
    "密码（游客无需填写）",
    "密碼（訪客無需填寫）",
    "パスワード（ゲストは不要）",
    "비밀번호 (게스트는 불필요)"
  ],
  "Permanently delete account": [
    "永久删除账户",
    "永久刪除帳戶",
    "アカウントを完全に削除",
    "계정 영구 삭제"
  ],
  "THE GOLDEN HONOUR ROLL": [
    "金叶荣耀榜",
    "金葉榮耀榜",
    "黄金の栄誉ランキング",
    "황금 명예 순위"
  ],
  "PLAYERS & VIRTUAL FRIENDS · TOTAL WON": [
    "玩家与虚拟伙伴 · 累计获奖",
    "玩家與虛擬夥伴 · 累計獲獎",
    "プレイヤーと仮想キャラ · 累計獲得",
    "플레이어 및 가상 친구 · 누적 획득"
  ],
  "VIRTUAL": [
    "虚拟角色",
    "虛擬角色",
    "仮想キャラ",
    "가상 캐릭터"
  ],
  "PLAYER": [
    "玩家",
    "玩家",
    "プレイヤー",
    "플레이어"
  ],
  "YOU": [
    "你",
    "你",
    "あなた",
    "나"
  ],
  "Grow your next record": [
    "前往游戏，刷新纪录",
    "前往遊戲，刷新紀錄",
    "プレイして記録を更新",
    "게임에서 기록 갱신"
  ],
  "THE TREASURE EMPORIUM": [
    "金叶宝藏商店",
    "金葉寶藏商店",
    "黄金の宝物ショップ",
    "황금 보물 상점"
  ],
  "Choose a little woodland abundance": [
    "挑选你的林间财宝",
    "挑選你的林間財寶",
    "森の宝物を選びましょう",
    "숲속 보물을 선택하세요"
  ],
  "COIN SATCHEL": [
    "金币袋",
    "金幣袋",
    "コイン袋",
    "코인 주머니"
  ],
  "GOLDEN RESERVE": [
    "黄金储备",
    "黃金儲備",
    "黄金の蓄え",
    "황금 비축"
  ],
  "JEWEL CHEST": [
    "珠宝宝箱",
    "珠寶寶箱",
    "宝石の宝箱",
    "보석 상자"
  ],
  "ROYAL HARVEST": [
    "皇家丰收",
    "皇家豐收",
    "王室の収穫",
    "왕실의 수확"
  ],
  "Purchases unavailable": [
    "暂不可购买",
    "暫不可購買",
    "購入できません",
    "구매 불가"
  ],
  "Virtual coins for your woodland games": [
    "用于林间游戏的虚拟金币",
    "用於林間遊戲的虛擬金幣",
    "森のゲーム用仮想コイン",
    "숲속 게임용 가상 코인"
  ],
  "Restore purchases": [
    "恢复购买",
    "回復購買",
    "購入の復元",
    "구매 복원"
  ],
  "SEVEN DAYS OF GOLD": [
    "七日金叶好礼",
    "七日金葉好禮",
    "7日間の黄金ギフト",
    "7일간의 황금 선물"
  ],
  "CLAIMED": [
    "已领取",
    "已領取",
    "受取済み",
    "수령 완료"
  ],
  "TODAY": [
    "今日",
    "今日",
    "今日",
    "오늘"
  ],
  "LOCKED": [
    "未解锁",
    "未解鎖",
    "未解放",
    "잠김"
  ],
  "TODAY’S HARVEST SAVED": [
    "今日奖励已入账",
    "今日獎勵已入帳",
    "今日の報酬は受取済みです",
    "오늘의 보상 수령 완료"
  ],
  "YOUR NEXT GOLDEN GIFT": [
    "你的下一份金叶好礼",
    "你的下一份金葉好禮",
    "次の黄金ギフト",
    "다음 황금 선물"
  ],
  "DAILY CHEST · 5,000": [
    "每日宝箱 · 5,000",
    "每日寶箱 · 5,000",
    "毎日の宝箱 · 5,000",
    "일일 상자 · 5,000"
  ],
  "Gift collected": [
    "已领取好礼",
    "已領取好禮",
    "受取済み",
    "수령 완료"
  ],
  "Collect daily chest": [
    "领取每日宝箱",
    "領取每日寶箱",
    "毎日の宝箱を受け取る",
    "일일 상자 받기"
  ],
  "Next reward after 00:00 UTC.": [
    "下次奖励于 UTC 00:00 后开放。",
    "下次獎勵於 UTC 00:00 後開放。",
    "次の報酬はUTC 00:00以降です。",
    "다음 보상은 UTC 00:00 이후 열립니다."
  ],
  "Today’s gift has already been collected.": [
    "今日奖励已领取。",
    "今日獎勵已領取。",
    "今日のギフトは受取済みです。",
    "오늘의 선물을 이미 받았습니다."
  ],
  "SPIN": [
    "旋转",
    "旋轉",
    "スピン",
    "스핀"
  ],
  "BET": [
    "下注",
    "下注",
    "ベット",
    "베팅"
  ],
  "WIN": [
    "获奖",
    "獲獎",
    "獲得",
    "획득"
  ],
  "BACK": [
    "返回",
    "返回",
    "戻る",
    "뒤로"
  ],
  "RULES": [
    "规则",
    "規則",
    "ルール",
    "규칙"
  ],
  "SOUND ON": [
    "音效开",
    "音效開",
    "音声オン",
    "소리 켜짐"
  ],
  "SOUND OFF": [
    "音效关",
    "音效關",
    "音声オフ",
    "소리 꺼짐"
  ],
  "AUTO ON": [
    "自动开",
    "自動開",
    "自動オン",
    "자동 켜짐"
  ],
  "AUTO OFF": [
    "自动关",
    "自動關",
    "自動オフ",
    "자동 꺼짐"
  ],
  "NICE WIN": [
    "精彩获奖",
    "精彩獲獎",
    "ナイスウィン",
    "나이스 윈"
  ],
  "BIG WIN": [
    "大奖",
    "大獎",
    "ビッグウィン",
    "빅 윈"
  ],
  "MEGA WIN": [
    "超级大奖",
    "超級大獎",
    "メガウィン",
    "메가 윈"
  ],
  "EPIC WIN": [
    "传奇大奖",
    "傳奇大獎",
    "エピックウィン",
    "에픽 윈"
  ],
  "Collect treasure": [
    "收下财宝",
    "收下財寶",
    "宝物を受け取る",
    "보물 받기"
  ],
  "Tap to reveal the full amount": [
    "点击显示完整金额",
    "點擊顯示完整金額",
    "タップして全額を表示",
    "탭하여 전체 금액 보기"
  ],
  "Added to your wallet · Tap to continue": [
    "已存入钱包 · 点击继续",
    "已存入錢包 · 點擊繼續",
    "追加しました · タップして続行",
    "지갑에 추가됨 · 탭하여 계속"
  ],
  "Treasures in motion…": [
    "财宝转动中…",
    "財寶轉動中…",
    "宝物が回転中…",
    "보물이 돌아갑니다…"
  ],
  "Treasure added to your wallet.": [
    "奖励已存入钱包。",
    "獎勵已存入錢包。",
    "報酬をウォレットに追加しました。",
    "보상이 지갑에 추가되었습니다."
  ],
  "Auto spin on · Tap AUTO again to stop.": [
    "已开启自动旋转 · 再次点击自动键停止。",
    "已開啟自動旋轉 · 再次點擊自動鍵停止。",
    "自動スピン開始 · 自動ボタンで停止。",
    "자동 스핀 시작 · 자동 버튼을 다시 눌러 중지하세요."
  ],
  "Auto spin off.": [
    "已关闭自动旋转。",
    "已關閉自動旋轉。",
    "自動スピンを停止しました。",
    "자동 스핀이 꺼졌습니다."
  ],
  "Finish the current round before leaving.": [
    "请在当前回合结束后离开。",
    "請在目前回合結束後離開。",
    "現在のラウンド終了後に移動できます。",
    "현재 라운드가 끝난 후 이동하세요."
  ],
  "Finish the round before opening the shop.": [
    "请在回合结束后打开商店。",
    "請在回合結束後開啟商店。",
    "ラウンド終了後にショップを開けます。",
    "라운드가 끝난 후 상점을 여세요."
  ],
  "3 reels · Golden acorn picks": [
    "3 转轴 · 金橡果寻宝",
    "3 轉軸 · 金橡果尋寶",
    "3リール · 黄金どんぐり選び",
    "3릴 · 황금 도토리 선택"
  ],
  "20 lines · Ruby lock & respin": [
    "20 赔付线 · 红宝锁定重转",
    "20 賠付線 · 紅寶鎖定重轉",
    "20ライン · ルビーロック再スピン",
    "20라인 · 루비 잠금 리스핀"
  ],
  "1,024 ways · Pearl wild columns": [
    "1,024 方式 · 珍珠百搭整列",
    "1,024 方式 · 珍珠百搭整列",
    "1,024ウェイズ · パールワイルド列",
    "1,024웨이 · 진주 와일드 열"
  ],
  "5+ clusters · Crown cascades": [
    "5+ 相连 · 皇冠连消",
    "5+ 相連 · 皇冠連消",
    "5個以上の連結 · 王冠連鎖",
    "5개 이상 연결 · 왕관 연쇄"
  ],
  "ACORN": [
    "橡果",
    "橡果",
    "どんぐり",
    "도토리"
  ],
  "RUBY": [
    "红宝",
    "紅寶",
    "ルビー",
    "루비"
  ],
  "PEARL": [
    "珍珠",
    "珍珠",
    "パール",
    "진주"
  ],
  "CROWN": [
    "皇冠",
    "皇冠",
    "王冠",
    "왕관"
  ],
  "ACORN VAULT": [
    "金橡果宝库",
    "金橡果寶庫",
    "黄金どんぐりの宝庫",
    "황금 도토리 금고"
  ],
  "RUBY ORCHARD": [
    "红宝果园",
    "紅寶果園",
    "ルビー果樹園",
    "루비 과수원"
  ],
  "PEARL BROOK": [
    "珍珠溪流",
    "珍珠溪流",
    "真珠の小川",
    "진주 시냇물"
  ],
  "CROWN NEST": [
    "皇冠鸟巢",
    "皇冠鳥巢",
    "王冠の巣",
    "왕관 둥지"
  ],
  "PAYOUTS": [
    "赔付表",
    "賠付表",
    "配当表",
    "배당표"
  ],
  "FEATURES": [
    "特色玩法",
    "特色玩法",
    "機能",
    "특수 기능"
  ],
  "SYMBOL": [
    "符号",
    "符號",
    "シンボル",
    "심볼"
  ],
  "WILD": [
    "百搭",
    "百搭",
    "ワイルド",
    "와일드"
  ],
  "ONE CENTRE LINE": [
    "中央单线",
    "中央單線",
    "中央の1ライン",
    "중앙 1라인"
  ],
  "PER WINNING LINE · 20 FIXED LINES": [
    "每条中奖线 · 20 条固定线",
    "每條中獎線 · 20 條固定線",
    "1ラインあたり · 固定20ライン",
    "당첨 라인당 · 고정 20라인"
  ],
  "PER SINGLE WINNING WAY": [
    "每种中奖方式",
    "每種中獎方式",
    "1ウェイあたり",
    "당첨 웨이당"
  ],
  "PER CONNECTED GROUP · BEFORE CASCADES": [
    "每个相连组 · 连消前",
    "每個相連組 · 連消前",
    "連結グループあたり · 連鎖前",
    "연결 그룹당 · 연쇄 전"
  ],
  "Show groups 5–9": [
    "查看 5–9 个一组",
    "查看 5–9 個一組",
    "5～9個のグループ",
    "5~9개 그룹 보기"
  ],
  "Show groups 10–25": [
    "查看 10–25 个一组",
    "查看 10–25 個一組",
    "10～25個のグループ",
    "10~25개 그룹 보기"
  ],
  "Multiple ways combine before rounding. 1,024 is the maximum number of five-reel ways.": [
    "多种中奖方式合计后取整。五转轴最多有 1,024 种方式。",
    "多種中獎方式合計後取整。五轉軸最多有 1,024 種方式。",
    "複数ウェイを合算してから端数処理します。5リールの最大ウェイ数は1,024です。",
    "여러 웨이를 합산한 뒤 반올림합니다. 5릴의 최대 웨이 수는 1,024입니다."
  ],
  "Match consecutive reels from the left. WILD substitutes; the best result pays once per line.": [
    "从左起连续匹配。百搭可替代，每条线只支付最佳结果一次。",
    "從左起連續匹配。百搭可替代，每條線只支付最佳結果一次。",
    "左から連続して一致。ワイルドが代用し、各ラインの最良結果を1回支払います。",
    "왼쪽부터 연속 일치해야 합니다. 와일드가 대체하며 라인마다 최상 결과를 한 번 지급합니다."
  ],
  "3+ SAFES · VAULT PICK": [
    "3+ 宝库 · 选择寻宝",
    "3+ 寶庫 · 選擇尋寶",
    "宝庫3個以上 · 宝物選び",
    "금고 3개 이상 · 보물 선택"
  ],
  "6+ COINS · LOCK & RESPIN": [
    "6+ 金币 · 锁定重转",
    "6+ 金幣 · 鎖定重轉",
    "コイン6個以上 · ロック＆再スピン",
    "코인 6개 이상 · 잠금 리스핀"
  ],
  "3+ SAFES · 5 BONUS SPINS": [
    "3+ 宝库 · 5 次奖励旋转",
    "3+ 寶庫 · 5 次獎勵旋轉",
    "宝庫3個以上 · ボーナス5回",
    "금고 3개 이상 · 보너스 스핀 5회"
  ],
  "5+ NEIGHBOURS · CASCADES": [
    "5+ 相邻 · 连消",
    "5+ 相鄰 · 連消",
    "隣接5個以上 · 連鎖",
    "인접 5개 이상 · 연쇄"
  ],
  "Choose one of three vaults to reveal your prize. The award is already drawn; choice does not change the odds.": [
    "从三个宝库中选择一个揭晓奖励。奖励已抽取，选择不改变概率。",
    "從三個寶庫中選擇一個揭曉獎勵。獎勵已抽取，選擇不改變機率。",
    "3つの宝庫から1つ選んで賞品を表示。報酬は抽選済みで、選択は確率に影響しません。",
    "금고 3개 중 하나를 선택하세요. 보상은 이미 추첨되었으며 선택은 확률에 영향을 주지 않습니다."
  ],
  "Five included bonus spins, with one full WILD column each. Bonus spins cannot retrigger. Winning ways multiply across consecutive reels from the left.": [
    "包含 5 次奖励旋转，每次有一整列百搭。奖励不能再次触发。从左起连续转轴的匹配数量相乘计算中奖方式。",
    "包含 5 次獎勵旋轉，每次有一整列百搭。獎勵不能再次觸發。從左起連續轉軸的匹配數量相乘計算中獎方式。",
    "ボーナス5回、各回にワイルド列が1列。再発動はありません。左から連続するリールの一致数を掛け合わせます。",
    "보너스 5회마다 와일드 열이 하나 있습니다. 재발동은 없습니다. 왼쪽부터 연속 릴의 일치 수를 곱해 웨이를 계산합니다."
  ],
  "Groups join horizontally or vertically, never diagonally. Winning symbols leave; new treasures drop in.": [
    "符号水平或垂直相连，斜向不算。中奖符号消除后，新财宝落入。",
    "符號水平或垂直相連，斜向不算。中獎符號消除後，新財寶落入。",
    "上下左右で連結し、斜めは対象外。一致シンボルが消え、新しい宝物が落下します。",
    "상하좌우로만 연결되며 대각선은 제외됩니다. 당첨 심볼이 사라지고 새 보물이 내려옵니다."
  ],
  "First awards use the payout table. Up to 8 refills follow. Their multipliers rise: 2×, 3×, 4×, 5×, 6×, 7×, 8×, 9×. Each refill multiplies its rounded base award.": [
    "首次按赔付表结算，最多再补充 8 次。倍率依次为 2× 至 9×，每次以取整后的基础奖励乘以倍率。",
    "首次按賠付表結算，最多再補充 8 次。倍率依次為 2× 至 9×，每次以取整後的基礎獎勵乘以倍率。",
    "初回は配当表に従い、最大8回補充。倍率は2×から9×に上昇し、端数処理後の基本報酬に掛けます。",
    "첫 보상은 배당표를 따르며 최대 8회 보충됩니다. 배율은 2×부터 9×까지 증가하며 반올림한 기본 보상에 곱합니다."
  ],
  "Unlocking your treasury…": [
    "正在开启宝库…",
    "正在開啟寶庫…",
    "宝庫を開いています…",
    "금고를 여는 중…"
  ],
  "Your garden is ready": [
    "金色花园已就绪",
    "金色花園已就緒",
    "黄金の庭の準備完了",
    "황금 정원이 준비되었습니다"
  ],
  "PORTRAIT MODE ROTATE YOUR DEVICE": [
    "请竖屏使用\n旋转你的设备",
    "請直向使用\n旋轉你的裝置",
    "縦向きでご利用ください\n端末を回転してください",
    "세로 모드로 사용하세요\n기기를 회전하세요"
  ],
  "BET {0} selected": [
    "已选择投注 {0}",
    "已選擇投注 {0}",
    "ベット {0} を選択",
    "베팅 {0} 선택됨"
  ],
  "WIN {0}": [
    "获奖 {0}",
    "獲獎 {0}",
    "獲得 {0}",
    "당첨 {0}"
  ],
  "RETURN {0}": [
    "返还 {0}",
    "返還 {0}",
    "払戻 {0}",
    "반환 {0}"
  ],
  "TOP WIN {0}": [
    "最高获奖 {0}",
    "最高獲獎 {0}",
    "最高獲得 {0}",
    "최고 당첨 {0}"
  ],
  "{0} COINS": [
    "{0} 金币",
    "{0} 金幣",
    "{0} コイン",
    "{0} 코인"
  ],
  "DAY {0}": [
    "第 {0} 天",
    "第 {0} 天",
    "{0}日目",
    "{0}일차"
  ],
  "DAY {0} · COLLECTED": [
    "第 {0} 天 · 已领取",
    "第 {0} 天 · 已領取",
    "{0}日目 · 受取済",
    "{0}일차 · 수령 완료"
  ],
  "DAY {0} · READY TO HARVEST": [
    "第 {0} 天 · 可领取",
    "第 {0} 天 · 可領取",
    "{0}日目 · 受取可能",
    "{0}일차 · 수령 가능"
  ],
  "CLAIM DAY {0} · {1}": [
    "领取第 {0} 天 · {1}",
    "領取第 {0} 天 · {1}",
    "{0}日目を受取 · {1}",
    "{0}일차 수령 · {1}"
  ],
  "+{0} coins · Added to your wallet": [
    "+{0} 金币 · 已存入钱包",
    "+{0} 金幣 · 已存入錢包",
    "+{0} コイン · 追加済",
    "+{0} 코인 · 지갑에 추가됨"
  ],
  "COIN AWARDS AT BET {0}": [
    "投注 {0} 时的金币奖励",
    "投注 {0} 時的金幣獎勵",
    "ベット {0} のコイン配当",
    "베팅 {0}의 코인 배당"
  ],
  "{0} MATCH": [
    "匹配 {0} 个",
    "匹配 {0} 個",
    "{0}個一致",
    "{0}개 일치"
  ],
  "CROWN CASCADE · {0}×": [
    "皇冠连消 · {0}×",
    "皇冠連消 · {0}×",
    "クラウン連鎖 · {0}×",
    "왕관 연쇄 · {0}×"
  ],
  "LOCKED GOLD · {0} RESPINS LEFT": [
    "锁定金币 · 剩余 {0} 次重转",
    "鎖定金幣 · 剩餘 {0} 次重轉",
    "コインロック · 残り{0}回",
    "코인 잠금 · 리스핀 {0}회 남음"
  ],
  "PEARL WILD · {0} OF {1}": [
    "珍珠百搭 · {0}/{1}",
    "珍珠百搭 · {0}/{1}",
    "パールワイルド · {0}/{1}",
    "진주 와일드 · {0}/{1}"
  ],
  "Polishing your treasures {0}%": [
    "正在准备财宝 {0}%",
    "正在準備財寶 {0}%",
    "宝物を準備中 {0}%",
    "보물 준비 중 {0}%"
  ],
  "Account already exists.": [
    "账户已存在。",
    "帳戶已存在。",
    "アカウントは既に存在します。",
    "이미 존재하는 계정입니다."
  ],
  "Nickname must contain 2–18 characters.": [
    "昵称需要 2–18 个字符。",
    "暱稱需要 2–18 個字元。",
    "ニックネームは2～18文字です。",
    "닉네임은 2~18자여야 합니다."
  ],
  "Password is incorrect.": [
    "密码错误。",
    "密碼錯誤。",
    "パスワードが違います。",
    "비밀번호가 올바르지 않습니다."
  ],
  "Password must contain 10–72 characters.": [
    "密码需要 10–72 个字符。",
    "密碼需要 10–72 個字元。",
    "パスワードは10～72文字です。",
    "비밀번호는 10~72자여야 합니다."
  ],
  "Passwords do not match.": [
    "两次密码不一致。",
    "兩次密碼不一致。",
    "パスワードが一致しません。",
    "비밀번호가 일치하지 않습니다."
  ],
  "Username or password is incorrect.": [
    "用户名或密码错误。",
    "使用者名稱或密碼錯誤。",
    "ユーザー名またはパスワードが違います。",
    "사용자 이름 또는 비밀번호가 올바르지 않습니다."
  ],
  "Sign in with Apple becomes available in the signed iOS build.": [
    "Apple 登录将在签名后的 iOS 版本中启用。",
    "Apple 登入將在簽署後的 iOS 版本中啟用。",
    "Appleログインは署名済みiOS版で利用できます。",
    "Apple 로그인은 서명된 iOS 빌드에서 이용할 수 있습니다."
  ],
  "Username must be 3–18 letters, digits, or underscores.": [
    "用户名需为 3–18 位字母、数字或下划线。",
    "使用者名稱需為 3–18 位字母、數字或底線。",
    "ユーザー名は英数字と下線で3～18文字です。",
    "사용자 이름은 영문, 숫자, 밑줄로 3~18자입니다."
  ],
  "Your session expired. Please sign in again.": [
    "登录已过期，请重新登录。",
    "登入已過期，請重新登入。",
    "セッションが切れました。再ログインしてください。",
    "세션이 만료되었습니다. 다시 로그인하세요."
  ],
  "PLAY": [
    "开始游戏",
    "開始遊戲",
    "プレイ",
    "플레이"
  ],
  "Rules": [
    "规则",
    "規則",
    "ルール",
    "규칙"
  ],
  "Guest": [
    "游客",
    "訪客",
    "ゲスト",
    "게스트"
  ],
  "Round limit: {0} coins. Virtual coins only · No cash-out": [
    "单局上限：{0} 金币。\n仅虚拟金币 · 不可提现",
    "單局上限：{0} 金幣。\n僅虛擬金幣 · 不可提現",
    "1ラウンド上限：{0} コイン。\n仮想コインのみ · 換金不可",
    "라운드 한도: {0} 코인.\n가상 코인 전용 · 현금화 불가"
  ],
  "Safes pay {0} coins. The vault adds one of: {1}": [
    "宝库符号奖励 {0} 金币，另加以下一项：\n{1}",
    "寶庫符號獎勵 {0} 金幣，另加以下一項：\n{1}",
    "宝庫配当は{0}コイン。追加報酬は次のいずれか：\n{1}",
    "금고 배당 {0} 코인. 다음 중 하나 추가:\n{1}"
  ],
  "Each locked coin is worth one of: {0} coins.": [
    "每枚锁定金币的价值为以下一项：\n{0} 金币。",
    "每枚鎖定金幣的價值為以下一項：\n{0} 金幣。",
    "ロックコインの価値は次のいずれか：\n{0} コイン。",
    "잠긴 코인의 가치는 다음 중 하나:\n{0} 코인."
  ],
  "Start with 3 respins. A new coin resets them to 3. All 15 positions filled adds {0} coins. The feature ends after 40 rounds at most.": [
    "初始 3 次重转，新金币将次数重置为 3。填满 15 格额外获得 {0} 金币。最多进行 40 轮。",
    "初始 3 次重轉，新金幣將次數重設為 3。填滿 15 格額外獲得 {0} 金幣。最多進行 40 輪。",
    "再スピン3回で開始。新コインで3回にリセット。15マス全て埋まると{0}コイン追加。最大40ラウンド。",
    "리스핀 3회로 시작하며 새 코인이 나오면 3회로 초기화됩니다. 15칸을 채우면 {0} 코인 추가. 최대 40라운드입니다."
  ],
  "Safe awards: 3 = {0} · 4 = {1} 5 or more = {2} coins.": [
    "宝库奖励：3 个 = {0} · 4 个 = {1}\n5 个及以上 = {2} 金币。",
    "寶庫獎勵：3 個 = {0} · 4 個 = {1}\n5 個及以上 = {2} 金幣。",
    "宝庫配当：3個 = {0} · 4個 = {1}\n5個以上 = {2} コイン。",
    "금고 배당: 3개 = {0} · 4개 = {1}\n5개 이상 = {2} 코인."
  ],
  "Day {0} · {1} coins · Collected": [
    "第 {0} 天 · {1} 金币 · 已领取",
    "第 {0} 天 · {1} 金幣 · 已領取",
    "{0}日目 · {1}コイン · 受取済",
    "{0}일차 · {1} 코인 · 수령 완료"
  ],
  "Day {0} · {1} coins · Available on a later day": [
    "第 {0} 天 · {1} 金币 · 后续可领取",
    "第 {0} 天 · {1} 金幣 · 後續可領取",
    "{0}日目 · {1}コイン · 後日受取可能",
    "{0}일차 · {1} 코인 · 추후 수령 가능"
  ],
  "Before you enter": [
    "进入之前",
    "進入之前",
    "入場の前に",
    "입장하기 전에"
  ],
  "I am eligible · Continue": [
    "我符合条件 · 继续",
    "我符合條件 · 繼續",
    "条件を満たしています · 続行",
    "이용 자격 확인 · 계속"
  ],
  "This is a simulated casino for eligible adults. Coins have no cash value and cannot be withdrawn. Confirm that you meet your region’s minimum age and accept the Terms and Privacy Policy.": [
    "本游戏为面向符合条件成年人的模拟娱乐场。金币无现金价值且不可提现。请确认你符合所在地区最低年龄要求，并接受条款与隐私政策。",
    "本遊戲為面向符合條件成年人的模擬娛樂場。金幣無現金價值且不可提現。請確認你符合所在地區最低年齡要求，並接受條款與隱私政策。",
    "対象年齢の成人向けシミュレーションカジノです。コインに金銭的価値はなく換金できません。地域の最低年齢を満たし、規約とプライバシーポリシーに同意してください。",
    "이용 자격을 갖춘 성인용 모의 카지노입니다. 코인은 현금 가치가 없으며 출금할 수 없습니다. 지역의 최소 연령을 충족하고 약관과 개인정보 처리방침에 동의해 주세요."
  ],
  "Canopy membership terms": [
    "金叶福庭会员条款",
    "金葉福庭會員條款",
    "会員規約",
    "회원 약관"
  ],
  "Confirm that you meet your region’s minimum age and accept the current Terms and Privacy Policy. Virtual coins have no cash value.": [
    "请确认符合所在地区最低年龄要求，并接受现行条款和隐私政策。虚拟金币无现金价值。",
    "請確認符合所在地區最低年齡要求，並接受現行條款和隱私政策。虛擬金幣無現金價值。",
    "地域の最低年齢を満たし、現行の規約とプライバシーポリシーに同意してください。仮想コインに金銭的価値はありません。",
    "지역의 최소 연령을 충족하고 현재 약관 및 개인정보 처리방침에 동의해 주세요. 가상 코인에는 현금 가치가 없습니다."
  ],
  "Accept & continue": [
    "接受并继续",
    "接受並繼續",
    "同意して続行",
    "동의하고 계속"
  ],
  "Sign out to review policies": [
    "退出登录，查看政策",
    "登出，查看政策",
    "ログアウトして規約を確認",
    "로그아웃하고 정책 확인"
  ],
  "Terms of Service": [
    "服务条款",
    "服務條款",
    "利用規約",
    "이용 약관"
  ],
  "Privacy & Data": [
    "隐私与数据",
    "隱私與資料",
    "プライバシーとデータ",
    "개인정보 및 데이터"
  ],
  "Player Support": [
    "玩家帮助",
    "玩家支援",
    "プレイヤーサポート",
    "플레이어 지원"
  ],
  "Gold bullion": [
    "金条",
    "金條",
    "金塊",
    "금괴"
  ],
  "Oak medallion": [
    "橡树金章",
    "橡樹金章",
    "オークメダル",
    "참나무 메달"
  ],
  "Golden acorn": [
    "金橡果",
    "金橡果",
    "黄金どんぐり",
    "황금 도토리"
  ],
  "Treasury ring": [
    "宝库金戒",
    "寶庫金戒",
    "宝庫の指輪",
    "금고 반지"
  ],
  "Bullion chest": [
    "金条宝箱",
    "金條寶箱",
    "金塊の宝箱",
    "금괴 상자"
  ],
  "Gold reserve crown": [
    "金储皇冠",
    "金儲皇冠",
    "黄金の王冠",
    "황금 왕관"
  ],
  "Ruby medallion": [
    "红宝石金章",
    "紅寶石金章",
    "ルビーメダル",
    "루비 메달"
  ],
  "Velvet coin purse": [
    "绒面钱袋",
    "絨面錢袋",
    "ベルベットの金袋",
    "벨벳 동전 주머니"
  ],
  "Royal vault key": [
    "皇家宝库钥匙",
    "皇家寶庫鑰匙",
    "王家の宝庫の鍵",
    "왕실 금고 열쇠"
  ],
  "Ruby treasure coffer": [
    "红宝石宝箱",
    "紅寶石寶箱",
    "ルビーの宝箱",
    "루비 보물 상자"
  ],
  "Ruby crown": [
    "红宝石皇冠",
    "紅寶石皇冠",
    "ルビーの王冠",
    "루비 왕관"
  ],
  "Pearl medallion": [
    "珍珠金章",
    "珍珠金章",
    "パールメダル",
    "진주 메달"
  ],
  "Pearl water vial": [
    "珍珠水瓶",
    "珍珠水瓶",
    "真珠の小瓶",
    "진주 물병"
  ],
  "Lotus pearl": [
    "莲花珍珠",
    "蓮花珍珠",
    "蓮の真珠",
    "연꽃 진주"
  ],
  "Pearl ring": [
    "珍珠戒指",
    "珍珠戒指",
    "真珠の指輪",
    "진주 반지"
  ],
  "Pearl crown": [
    "珍珠皇冠",
    "珍珠皇冠",
    "真珠の王冠",
    "진주 왕관"
  ],
  "Royal medallion": [
    "皇家金章",
    "皇家金章",
    "王家のメダル",
    "왕실 메달"
  ],
  "Sapphire coin purse": [
    "蓝宝石钱袋",
    "藍寶石錢袋",
    "サファイアの金袋",
    "사파이어 동전 주머니"
  ],
  "Sapphire egg": [
    "蓝宝石彩蛋",
    "藍寶石彩蛋",
    "サファイアの卵",
    "사파이어 알"
  ],
  "Royal treasure chest": [
    "皇家宝箱",
    "皇家寶箱",
    "王家の宝箱",
    "왕실 보물 상자"
  ],
  "Nest crown": [
    "巢之皇冠",
    "巢之皇冠",
    "巣の王冠",
    "둥지 왕관"
  ],
  "DATA WE PROCESS": [
    "处理的数据",
    "處理的資料",
    "処理するデータ",
    "처리하는 데이터"
  ],
  "WHY WE USE IT": [
    "使用目的",
    "使用目的",
    "利用目的",
    "이용 목적"
  ],
  "PAYMENTS & TRACKING": [
    "支付与追踪",
    "付款與追蹤",
    "決済と追跡",
    "결제 및 추적"
  ],
  "STORAGE & RETENTION": [
    "存储与保留",
    "儲存與保留",
    "保存と保持",
    "저장 및 보관"
  ],
  "YOUR CONTROLS": [
    "你的管理权",
    "你的管理權",
    "管理できること",
    "사용자 관리 권한"
  ],
  "ELIGIBILITY": [
    "使用资格",
    "使用資格",
    "利用資格",
    "이용 자격"
  ],
  "VIRTUAL COINS": [
    "虚拟金币",
    "虛擬金幣",
    "仮想コイン",
    "가상 코인"
  ],
  "APPLE PURCHASES": [
    "Apple 购买",
    "Apple 購買",
    "Appleでの購入",
    "Apple 구매"
  ],
  "GAME RESULTS": [
    "游戏结果",
    "遊戲結果",
    "ゲーム結果",
    "게임 결과"
  ],
  "FAIR USE": [
    "公平使用",
    "公平使用",
    "公正な利用",
    "공정한 이용"
  ],
  "PURCHASE PENDING": [
    "购买待处理",
    "購買待處理",
    "購入保留中",
    "구매 대기 중"
  ],
  "COINS NOT SHOWN": [
    "金币未到账",
    "金幣未到帳",
    "コイン未反映",
    "코인 미지급"
  ],
  "REFUNDS": [
    "退款",
    "退款",
    "返金",
    "환불"
  ],
  "ACCOUNT & DATA": [
    "账户与数据",
    "帳戶與資料",
    "アカウントとデータ",
    "계정 및 데이터"
  ],
  "SAFER PLAY": [
    "健康游戏",
    "健康遊戲",
    "安心して遊ぶために",
    "건전한 플레이"
  ],
  "Account name, nickname, password verifier, avatar and settings. Play history, virtual wallet, rewards and Apple transaction IDs.": [
    "账户名、昵称、密码验证信息、头像和设置；游戏记录、虚拟钱包、奖励和 Apple 交易编号。",
    "帳戶名稱、暱稱、密碼驗證資訊、頭像和設定；遊戲紀錄、虛擬錢包、獎勵和 Apple 交易編號。",
    "アカウント名、ニックネーム、パスワード検証情報、アバター、設定、プレイ履歴、仮想ウォレット、報酬、Apple取引ID。",
    "계정 이름, 닉네임, 비밀번호 검증 정보, 아바타, 설정, 플레이 기록, 가상 지갑, 보상 및 Apple 거래 ID."
  ],
  "To sign you in, run fair rounds, keep your wallet and deliver purchases. Also to prevent duplicates, provide support and protect the service.": [
    "用于登录、公平游戏、维护钱包和交付购买内容；也用于防止重复交易、提供帮助和保护服务。",
    "用於登入、公平遊戲、維護錢包和交付購買內容；也用於防止重複交易、提供支援和保護服務。",
    "ログイン、公正なゲーム、ウォレット管理、購入品の提供、重複防止、サポート、サービス保護に使用します。",
    "로그인, 공정한 게임, 지갑 관리, 구매 제공, 중복 방지, 지원 및 서비스 보호에 사용합니다."
  ],
  "Apple processes payment details; we do not receive full card details. We do not sell personal data or use advertising tracking.": [
    "Apple 处理支付信息，我们不会收到完整银行卡信息。我们不出售个人数据，也不进行广告追踪。",
    "Apple 處理付款資訊，我們不會收到完整銀行卡資訊。我們不出售個人資料，也不進行廣告追蹤。",
    "決済情報はAppleが処理し、完全なカード情報は受け取りません。個人データの販売や広告追跡は行いません。",
    "Apple이 결제 정보를 처리하며 당사는 전체 카드 정보를 받지 않습니다. 개인정보를 판매하거나 광고 추적을 하지 않습니다."
  ],
  "Preferences stay on device. Account, wallet and verified transactions stay on the service while active or as legally required.": [
    "偏好设置保存在设备上。账户、钱包及已验证交易在服务使用期间或法律要求期限内保存在服务端。",
    "偏好設定儲存在裝置上。帳戶、錢包及已驗證交易在服務使用期間或法律要求期限內儲存在伺服器端。",
    "設定は端末に保存します。アカウント、ウォレット、検証済み取引は利用期間中または法令上必要な期間、サービスに保存します。",
    "환경설정은 기기에 저장됩니다. 계정, 지갑, 검증된 거래는 이용 기간 또는 법적 필요 기간 동안 서비스에 보관됩니다."
  ],
  "Delete your account in Settings. Required fraud, tax, refund or legal records may be retained for the period stated in the full policy.": [
    "可在设置中删除账户。反欺诈、税务、退款或法律要求的记录，可能按完整政策规定的期限保留。",
    "可在設定中刪除帳戶。反詐欺、稅務、退款或法律要求的紀錄，可能按完整政策規定的期限保留。",
    "設定からアカウントを削除できます。不正防止、税務、返金、法令上必要な記録は、ポリシー記載の期間保持する場合があります。",
    "설정에서 계정을 삭제할 수 있습니다. 사기 방지, 세금, 환불 또는 법적 기록은 전체 정책에 명시된 기간 동안 보관될 수 있습니다."
  ],
  "Use the game only if you meet the regional minimum age for simulated gambling and local law allows access.": [
    "仅在符合当地模拟博彩最低年龄要求且当地法律允许时使用本游戏。",
    "僅在符合當地模擬博彩最低年齡要求且當地法律允許時使用本遊戲。",
    "地域の模擬ギャンブルの最低年齢を満たし、現地法で認められる場合のみご利用ください。",
    "지역의 모의 도박 최소 연령을 충족하고 현지 법률에서 허용하는 경우에만 이용하세요."
  ],
  "Coins are entertainment items with no cash value. They cannot be redeemed, transferred, sold or exchanged for real-world prizes.": [
    "金币仅用于娱乐，没有现金价值，不可兑现、转让、出售或兑换现实奖品。",
    "金幣僅用於娛樂，沒有現金價值，不可兌現、轉讓、出售或兌換現實獎品。",
    "コインは娯楽用で金銭的価値はありません。換金、譲渡、販売、現実の賞品との交換はできません。",
    "코인은 현금 가치가 없는 오락용 아이템입니다. 환전, 양도, 판매 또는 실제 경품 교환이 불가합니다."
  ],
  "Coin packs are consumable Apple In-App Purchases. Apple handles payment and refunds; server verification is required before delivery.": [
    "金币包属于消耗型 Apple 应用内购买。Apple 处理支付和退款；发放前需要服务端验证。",
    "金幣包屬於消耗型 Apple App 內購買。Apple 處理付款和退款；發放前需要伺服器驗證。",
    "コインパックは消耗型Appleアプリ内課金です。決済と返金はAppleが処理し、提供前にサーバー検証が必要です。",
    "코인 팩은 소모성 Apple 인앱 구매입니다. Apple이 결제와 환불을 처리하며 지급 전 서버 검증이 필요합니다."
  ],
  "Rules and paytables determine results. RTP is a long-run estimate, not a promise that an individual session will win.": [
    "游戏结果依据规则和赔付表。RTP 是长期估计值，不保证单次游戏获利。",
    "遊戲結果依據規則和賠付表。RTP 是長期估計值，不保證單次遊戲獲利。",
    "結果はルールと配当表に基づきます。RTPは長期推定値であり、個々のプレイでの勝利を保証しません。",
    "결과는 규칙과 배당표에 따릅니다. RTP는 장기 추정치이며 개별 세션의 당첨을 보장하지 않습니다."
  ],
  "Automation, tampering, transaction fraud, account resale and exploits are prohibited and may result in correction or restriction.": [
    "禁止自动化作弊、篡改、交易欺诈、账户转售及漏洞利用，违规可能导致纠正或限制。",
    "禁止自動化作弊、竄改、交易詐欺、帳戶轉售及漏洞利用，違規可能導致修正或限制。",
    "自動化、不正改変、取引詐欺、アカウント転売、脆弱性の悪用は禁止され、修正や制限の対象となります。",
    "자동화, 변조, 거래 사기, 계정 재판매 및 취약점 악용은 금지되며 수정 또는 제한될 수 있습니다."
  ],
  "Do not buy the same pack again. Wait for Apple approval, then use Sync Purchases in the Coin Shop.": [
    "请勿重复购买同一礼包。等待 Apple 批准后，在商店使用恢复购买。",
    "請勿重複購買同一禮包。等待 Apple 核准後，在商店使用恢復購買。",
    "同じパックを再購入しないでください。Appleの承認後、ショップの購入復元を利用してください。",
    "동일한 팩을 다시 구매하지 마세요. Apple 승인 후 상점에서 구매 복원을 이용하세요."
  ],
  "Open Coin Shop → Sync Purchases. Keep the Apple receipt and Player ID when contacting support.": [
    "打开商店 → 恢复购买。联系帮助时，请保留 Apple 收据及玩家编号。",
    "開啟商店 → 恢復購買。聯絡支援時，請保留 Apple 收據及玩家編號。",
    "ショップ → 購入復元を開いてください。問い合わせ時はAppleの領収書とプレイヤーIDをご用意ください。",
    "상점 → 구매 복원을 여세요. 지원 문의 시 Apple 영수증과 플레이어 ID를 보관해 주세요."
  ],
  "Request payment refunds through Apple. Refunded or revoked transactions may remove the corresponding unused virtual coins.": [
    "请通过 Apple 申请退款。退款或撤销交易可能扣除相应未使用的虚拟金币。",
    "請透過 Apple 申請退款。退款或撤銷交易可能扣除相應未使用的虛擬金幣。",
    "返金はAppleに申請してください。返金や取消により、対応する未使用コインが削除される場合があります。",
    "결제 환불은 Apple을 통해 요청하세요. 환불 또는 취소 시 해당 미사용 가상 코인이 회수될 수 있습니다."
  ],
  "Settings contains Delete Account & Data. Support can help with access, privacy questions and deletion status.": [
    "设置中提供删除账户及数据功能。帮助服务可处理登录、隐私问题和删除进度查询。",
    "設定中提供刪除帳戶及資料功能。支援服務可處理登入、隱私問題和刪除進度查詢。",
    "設定にアカウントとデータの削除があります。アクセス、プライバシー、削除状況はサポートにお問い合わせください。",
    "설정에서 계정 및 데이터를 삭제할 수 있습니다. 접근, 개인정보 문의 및 삭제 상태는 지원팀에 문의하세요."
  ],
  "This is simulated gambling with no cash-out. Take regular breaks and stop if the experience is no longer comfortable.": [
    "这是不可提现的模拟博彩。请定期休息，如感到不适请停止游戏。",
    "這是不可提現的模擬博彩。請定期休息，如感到不適請停止遊戲。",
    "換金できない模擬ギャンブルです。定期的に休憩し、不快に感じたらプレイをやめてください。",
    "현금화가 불가능한 모의 도박입니다. 정기적으로 휴식하고 불편해지면 플레이를 중단하세요."
  ],
  "Preparing your woodland journey…": [
    "正在准备林间旅程…",
    "正在準備林間旅程…",
    "森の旅を準備中…",
    "숲속 여행 준비 중…"
  ],
  "The cabinet could not load. Please try again.": [
    "柜机加载失败，请重试。",
    "機台載入失敗，請重試。",
    "筐体を読み込めません。再試行してください。",
    "기기를 불러올 수 없습니다. 다시 시도하세요."
  ],
  "Could not open the treasury. Tap to retry.": [
    "无法开启宝库，点击重试。",
    "無法開啟寶庫，點擊重試。",
    "宝庫を開けません。タップして再試行。",
    "금고를 열 수 없습니다. 탭하여 다시 시도하세요."
  ],
  "Unable to sign in.": [
    "无法登录。",
    "無法登入。",
    "ログインできません。",
    "로그인할 수 없습니다."
  ],
  "Unable to connect. Your form has been kept.": [
    "无法连接，已保留填写内容。",
    "無法連線，已保留填寫內容。",
    "接続できません。入力内容は保持されています。",
    "연결할 수 없습니다. 입력 내용은 보존되었습니다."
  ],
  "Unable to enter.": [
    "暂时无法进入。",
    "暫時無法進入。",
    "入場できません。",
    "입장할 수 없습니다."
  ],
  "Bet is locked while the reels are moving.": [
    "转轴运行时无法修改投注。",
    "轉軸運行時無法修改投注。",
    "回転中はベットを変更できません。",
    "릴 회전 중에는 베팅을 변경할 수 없습니다."
  ],
  "Minimum bet selected.": [
    "已达到最低投注。",
    "已達到最低投注。",
    "最低ベットです。",
    "최소 베팅입니다."
  ],
  "Maximum bet selected.": [
    "已达到最高投注。",
    "已達到最高投注。",
    "最高ベットです。",
    "최대 베팅입니다."
  ],
  "Sound settings are unavailable.": [
    "声音设置暂不可用。",
    "聲音設定暫不可用。",
    "サウンド設定を利用できません。",
    "사운드 설정을 사용할 수 없습니다."
  ],
  "Sound setting could not be saved.": [
    "声音设置保存失败。",
    "聲音設定儲存失敗。",
    "サウンド設定を保存できません。",
    "사운드 설정을 저장할 수 없습니다."
  ],
  "Sound on.": [
    "声音已开启。",
    "聲音已開啟。",
    "サウンドON。",
    "사운드 켜짐."
  ],
  "Sound off.": [
    "声音已关闭。",
    "聲音已關閉。",
    "サウンドOFF。",
    "사운드 꺼짐."
  ],
  "Unable to save the round. Free device storage, then try again.": [
    "无法保存本局，请清理设备空间后重试。",
    "無法儲存本局，請清理裝置空間後重試。",
    "ラウンドを保存できません。端末の空き容量を確保して再試行してください。",
    "라운드를 저장할 수 없습니다. 저장 공간을 확보한 후 다시 시도하세요."
  ],
  "Not enough coins. Visit Rewards or the Coin Shop.": [
    "金币不足，请前往奖励或商店。",
    "金幣不足，請前往獎勵或商店。",
    "コインが不足しています。報酬またはショップへ。",
    "코인이 부족합니다. 보상 또는 상점을 방문하세요."
  ],
  "Your round is settled and your coins are safe. You can spin again.": [
    "本局已结算，金币已保存，可以再次旋转。",
    "本局已結算，金幣已儲存，可以再次旋轉。",
    "ラウンドを精算しコインを保存しました。再スピンできます。",
    "라운드가 정산되고 코인이 저장되었습니다. 다시 스핀할 수 있습니다."
  ],
  "Round saved. Reconnect and tap SPIN to retrieve the same round, with no second bet.": [
    "本局已保存，联网后点击旋转恢复同一局，不会重复扣注。",
    "本局已儲存，連網後點擊旋轉恢復同一局，不會重複扣注。",
    "ラウンドを保存しました。再接続してスピンを押すと同じラウンドを復元し、再課金しません。",
    "라운드가 저장되었습니다. 재연결 후 스핀을 탭하면 같은 라운드를 복원하며 다시 차감하지 않습니다."
  ],
  "Round interrupted. Your wallet has been preserved.": [
    "本局中断，钱包已保留。",
    "本局中斷，錢包已保留。",
    "ラウンドが中断しました。ウォレットは保持されています。",
    "라운드가 중단되었습니다. 지갑은 보존되었습니다."
  ],
  "The three golden vaults": [
    "三座黄金宝库",
    "三座黃金寶庫",
    "3つの黄金宝庫",
    "세 개의 황금 금고"
  ],
  "Choose a vault to reveal your treasure": [
    "选择宝库，揭晓财宝",
    "選擇寶庫，揭曉財寶",
    "宝庫を選んで報酬を表示",
    "금고를 선택하여 보물 공개"
  ],
  "The prize is already drawn. Your choice does not change the odds.": [
    "奖励已抽取，选择不改变概率。",
    "獎勵已抽取，選擇不改變機率。",
    "報酬は抽選済みで、選択は確率に影響しません。",
    "보상은 이미 추첨되었으며 선택은 확률에 영향을 주지 않습니다."
  ],
  "COINS": [
    "金币",
    "金幣",
    "コイン",
    "코인"
  ],
  "Shop unavailable. Please try again.": [
    "商店暂不可用，请重试。",
    "商店暫不可用，請重試。",
    "ショップを利用できません。再試行してください。",
    "상점을 이용할 수 없습니다. 다시 시도하세요."
  ],
  "Unable to connect. Please try again.": [
    "无法连接，请重试。",
    "無法連線，請重試。",
    "接続できません。再試行してください。",
    "연결할 수 없습니다. 다시 시도하세요."
  ],
  "Unable to restore purchases. Please try again.": [
    "无法恢复购买，请重试。",
    "無法恢復購買，請重試。",
    "購入を復元できません。再試行してください。",
    "구매를 복원할 수 없습니다. 다시 시도하세요."
  ],
  "Unable to collect. Please try again.": [
    "领取失败，请重试。",
    "領取失敗，請重試。",
    "受け取れません。再試行してください。",
    "수령할 수 없습니다. 다시 시도하세요."
  ],
  "Unable to load honours.": [
    "排行加载失败。",
    "排行載入失敗。",
    "ランキングを読み込めません。",
    "순위를 불러올 수 없습니다."
  ],
  "Unable to delete.": [
    "删除失败。",
    "刪除失敗。",
    "削除できません。",
    "삭제할 수 없습니다."
  ],
  "Canopy post": [
    "金叶邮局",
    "金葉郵局",
    "黄金の郵便局",
    "황금 우체국"
  ],
  "Welcome to Golden Canopy. Your daily gifts are waiting in Rewards.": [
    "欢迎来到金叶福庭，每日好礼正在奖励页面等你。",
    "歡迎來到金葉福庭，每日好禮正在獎勵頁面等你。",
    "黄金の庭へようこそ。デイリーギフトが報酬ページで待っています。",
    "황금 정원에 오신 것을 환영합니다. 보상 페이지에서 일일 선물을 받으세요."
  ],
  "Visit Rewards": [
    "前往奖励",
    "前往獎勵",
    "報酬へ",
    "보상으로 이동"
  ],
  "Please confirm eligibility and accept the Terms and Privacy Policy.": [
    "请确认使用资格，并接受条款与隐私政策。",
    "請確認使用資格，並接受條款與隱私政策。",
    "利用資格を確認し、規約とプライバシーポリシーに同意してください。",
    "이용 자격을 확인하고 약관 및 개인정보 처리방침에 동의하세요."
  ],
  "Please confirm eligibility before continuing.": [
    "继续前请确认使用资格。",
    "繼續前請確認使用資格。",
    "続行前に利用資格を確認してください。",
    "계속하기 전에 이용 자격을 확인하세요."
  ],
  "Sign in with Apple is unavailable on this device.": [
    "此设备暂不支持 Apple 登录。",
    "此裝置暫不支援 Apple 登入。",
    "この端末ではAppleログインを利用できません。",
    "이 기기에서는 Apple 로그인을 이용할 수 없습니다."
  ],
  "Apple returned an incomplete authorization.": [
    "Apple 返回的授权信息不完整。",
    "Apple 傳回的授權資訊不完整。",
    "Appleの認証情報が不完全です。",
    "Apple 인증 정보가 불완전합니다."
  ],
  "Apple authorization could not be completed.": [
    "无法完成 Apple 授权。",
    "無法完成 Apple 授權。",
    "Apple認証を完了できません。",
    "Apple 인증을 완료할 수 없습니다."
  ],
  "No signed-in account was found.": [
    "未找到已登录账户。",
    "未找到已登入帳戶。",
    "ログイン中のアカウントがありません。",
    "로그인된 계정이 없습니다."
  ],
  "No saved local session.": [
    "没有已保存的本地会话。",
    "沒有已儲存的本機工作階段。",
    "保存済みのローカルセッションがありません。",
    "저장된 로컬 세션이 없습니다."
  ],
  "Secure credential storage is unavailable. Use HTTPS or localhost.": [
    "安全凭据存储不可用，请使用 HTTPS 或 localhost。",
    "安全憑證儲存不可用，請使用 HTTPS 或 localhost。",
    "安全な認証情報保存を利用できません。HTTPSまたはlocalhostをご利用ください。",
    "보안 인증 저장소를 사용할 수 없습니다. HTTPS 또는 localhost를 이용하세요."
  ],
  "Unable to delete the account.": [
    "无法删除账户。",
    "無法刪除帳戶。",
    "アカウントを削除できません。",
    "계정을 삭제할 수 없습니다."
  ],
  "Sign in to purchase virtual coins.": [
    "请先登录再购买虚拟金币。",
    "請先登入再購買虛擬金幣。",
    "仮想コインの購入にはログインしてください。",
    "가상 코인을 구매하려면 로그인하세요."
  ],
  "This purchase is already in progress.": [
    "这笔购买正在处理中。",
    "這筆購買正在處理中。",
    "この購入は処理中です。",
    "이 구매는 이미 처리 중입니다."
  ],
  "Secure Apple purchases are unavailable on this device.": [
    "此设备暂不支持安全 Apple 购买。",
    "此裝置暫不支援安全 Apple 購買。",
    "この端末では安全なApple購入を利用できません。",
    "이 기기에서는 안전한 Apple 구매를 이용할 수 없습니다."
  ],
  "StoreKit returned an incomplete transaction.": [
    "StoreKit 返回的交易信息不完整。",
    "StoreKit 傳回的交易資訊不完整。",
    "StoreKitの取引情報が不完全です。",
    "StoreKit 거래 정보가 불완전합니다."
  ],
  "The server-verified purchase did not match this product.": [
    "服务端验证的购买与此商品不匹配。",
    "伺服器驗證的購買與此商品不符。",
    "サーバー検証済みの購入が商品と一致しません。",
    "서버에서 검증한 구매가 이 상품과 일치하지 않습니다."
  ],
  "Verified purchase could not be credited.": [
    "已验证的购买暂时无法入账。",
    "已驗證的購買暫時無法入帳。",
    "検証済み購入を反映できません。",
    "검증된 구매를 지급할 수 없습니다."
  ],
  "Purchase verification is temporarily unavailable. No coins were granted.": [
    "购买验证暂不可用，尚未发放金币。",
    "購買驗證暫不可用，尚未發放金幣。",
    "購入検証を一時利用できません。コインは未付与です。",
    "구매 검증을 일시적으로 이용할 수 없습니다. 코인은 지급되지 않았습니다."
  ],
  "Sign in to synchronize purchases.": [
    "请先登录以同步购买。",
    "請先登入以同步購買。",
    "購入同期にはログインしてください。",
    "구매를 동기화하려면 로그인하세요."
  ],
  "Sandbox balance is already current.": [
    "沙盒余额已是最新状态。",
    "沙盒餘額已是最新狀態。",
    "サンドボックス残高は最新です。",
    "샌드박스 잔액은 이미 최신 상태입니다."
  ],
  "Purchase synchronization is temporarily unavailable.": [
    "购买同步暂不可用。",
    "購買同步暫不可用。",
    "購入同期を一時利用できません。",
    "구매 동기화를 일시적으로 이용할 수 없습니다."
  ],
  "Preparing your game…": [
    "正在准备游戏…",
    "正在準備遊戲…",
    "ゲームを準備中…",
    "게임 준비 중…"
  ],
  "Opening your game…": [
    "正在进入游戏…",
    "正在進入遊戲…",
    "ゲームを開いています…",
    "게임 여는 중…"
  ],
  "Ready": [
    "准备就绪",
    "準備就緒",
    "準備完了",
    "준비 완료"
  ],
  "Sandbox purchase verified.": [
    "沙盒购买已验证。",
    "沙盒購買已驗證。",
    "サンドボックス購入を検証しました。",
    "샌드박스 구매가 검증되었습니다."
  ],
  "Sandbox purchase failed.": [
    "沙盒购买失败。",
    "沙盒購買失敗。",
    "サンドボックス購入に失敗しました。",
    "샌드박스 구매에 실패했습니다."
  ],
  "Purchase cancelled.": [
    "购买已取消。",
    "購買已取消。",
    "購入をキャンセルしました。",
    "구매가 취소되었습니다."
  ],
  "Purchase is awaiting approval.": [
    "购买正在等待批准。",
    "購買正在等待核准。",
    "購入は承認待ちです。",
    "구매 승인 대기 중입니다."
  ],
  "Purchase could not be verified by StoreKit.": [
    "StoreKit 无法验证购买。",
    "StoreKit 無法驗證購買。",
    "StoreKitで購入を検証できません。",
    "StoreKit에서 구매를 검증할 수 없습니다."
  ],
  "This purchase was already credited.": [
    "这笔购买已入账。",
    "這筆購買已入帳。",
    "この購入は反映済みです。",
    "이 구매는 이미 지급되었습니다."
  ],
  "Purchase verified and coins delivered.": [
    "购买已验证，金币已到账。",
    "購買已驗證，金幣已到帳。",
    "購入を検証しコインを付与しました。",
    "구매가 검증되고 코인이 지급되었습니다."
  ],
  "Purchase balance synchronized.": [
    "购买余额已同步。",
    "購買餘額已同步。",
    "購入残高を同期しました。",
    "구매 잔액이 동기화되었습니다."
  ],
  "Unable to synchronize the verified balance.": [
    "无法同步已验证的余额。",
    "無法同步已驗證的餘額。",
    "検証済み残高を同期できません。",
    "검증된 잔액을 동기화할 수 없습니다."
  ]
};
Object.assign(translations,{"CANOPY GROWTH": ["金树生长", "金樹生長", "黄金樹の成長", "황금나무 성장"], "A central WILD or 3+ crowns plant a seed.": ["中央WILD或至少3个王冠触发生长。", "中央WILD或至少3個王冠觸發生長。", "中央のWILDまたは王冠3個以上で開始。", "중앙 WILD 또는 왕관 3개 이상으로 시작합니다."], "The centre becomes WILD. One random neighbouring cell grows into WILD on each of three steps; earlier growth stays.": ["中央成为WILD，随后每步将一个相邻格变成WILD，共3步。已生长的格子保留。", "中央成為WILD，隨後每步將一個相鄰格變成WILD，共3步。已生長的格子保留。", "中央がWILDになり、隣接する1マスずつを3回WILDに変えます。成長済みのマスは保持。", "중앙이 WILD가 됩니다. 3단계 동안 인접한 한 칸씩 WILD로 바뀌며 이전 성장은 유지됩니다."], "Each growth step pays line, ways or group awards. Growth only touches orthogonal neighbours. Scatter awards and retriggers are excluded.": ["每步按连线、路数或相邻组结算。仅向上下左右生长，不支付分散奖，不重复触发。", "每步按連線、路數或相鄰組結算。僅向上下左右生長，不支付分散獎，不重複觸發。", "各段階でライン・ウェイズ・連結グループを精算。上下左右のみ成長。スキャッター配当と再発動はありません。", "단계마다 라인·웨이·연결 그룹을 정산합니다. 상하좌우만 성장하며 스캐터 보상과 재발동은 없습니다."], "RECIPE COMPLETE": ["配方完成", "配方完成", "調合完了", "조합 완료"], "FORGE REFILL": ["炼金补充", "煉金補充", "素材補充", "재료 보충"], "CELESTIAL UPGRADE": ["财神点化", "財神點化", "財神の変化", "재신의 변환"]});
Object.assign(translations,CABINET_TRANSLATIONS);
Object.assign(translations,PRIMARY_TRANSLATIONS);
Object.assign(translations,{"VARIABLE HEIGHT WAYS": ["可变高度组合", "可變高度組合", "可変高さウェイズ", "가변 높이 웨이"], "ADJACENT PATHS": ["邻接路径", "鄰接路徑", "隣接経路", "인접 경로"], "DIAGONAL PATHS": ["斜向路径", "斜向路徑", "斜め経路", "대각선 경로"], "DOWNWARD PATHS": ["下行路径", "下行路徑", "下向き経路", "하향 경로"], "UPWARD PATHS": ["上行路径", "上行路徑", "上向き経路", "상향 경로"], "TOP-DOWN LINES": ["自上而下连线", "自上而下連線", "上から縦ライン", "위에서 세로 라인"], "BOTTOM-UP LINES": ["自下而上连线", "自下而上連線", "下から縦ライン", "아래에서 세로 라인"], "BEST-DIRECTION LINES": ["双向择优连线", "雙向擇優連線", "両方向の最高ライン", "양방향 최고 라인"], "VERTICAL ZIGZAGS": ["纵向折线", "縱向折線", "縦ジグザグ", "세로 지그재그"], "BOARD COLLECTION": ["全盘收集", "全盤收集", "全盤収集", "전체 수집"], "ROW COLLECTION": ["同行收集", "同行收集", "同行収集", "같은 행 수집"], "COLUMN COLLECTION": ["同列收集", "同列收集", "同列収集", "같은 열 수집"], "NEIGHBOUR COLLECTION": ["邻格收集", "鄰格收集", "隣接収集", "인접 수집"], "ANY-START WAYS": ["任意起列组合", "任意起列組合", "任意始点ウェイズ", "임의 시작 웨이"], "TWO INDEPENDENT BOARDS": ["双盘独立结算", "雙盤獨立結算", "独立した2盤", "독립 보드 2개"], "3 PAYLINES": ["3条固定线", "3條固定線", "3本の固定ライン", "고정 라인 3개"], "5 PAYLINES": ["5条固定线", "5條固定線", "5本の固定ライン", "고정 라인 5개"], "10 PAYLINES": ["10条固定线", "10條固定線", "10本の固定ライン", "고정 라인 10개"], "20 PAYLINES": ["20条固定线", "20條固定線", "20本の固定ライン", "고정 라인 20개"], "25 PAYLINES": ["25条固定线", "25條固定線", "25本の固定ライン", "고정 라인 25개"], "5+ CONNECTED CLUSTERS": ["5+相邻成团", "5+相鄰成團", "5個以上の連結群", "5개 이상 연결 그룹"], "5+ ANYWHERE COUNT": ["5+全盘计数", "5+全盤計數", "5個以上どこでも", "5개 이상 전체 집계"], "6+ CONNECTED CLUSTERS": ["6+相邻成团", "6+相鄰成團", "6個以上の連結群", "6개 이상 연결 그룹"], "6+ ANYWHERE COUNT": ["6+全盘计数", "6+全盤計數", "6個以上どこでも", "6개 이상 전체 집계"], "7+ CONNECTED CLUSTERS": ["7+相邻成团", "7+相鄰成團", "7個以上の連結群", "7개 이상 연결 그룹"], "7+ ANYWHERE COUNT": ["7+全盘计数", "7+全盤計數", "7個以上どこでも", "7개 이상 전체 집계"], "8+ CONNECTED CLUSTERS": ["8+相邻成团", "8+相鄰成團", "8個以上の連結群", "8개 이상 연결 그룹"], "8+ ANYWHERE COUNT": ["8+全盘计数", "8+全盤計數", "8個以上どこでも", "8개 이상 전체 집계"], "9+ CONNECTED CLUSTERS": ["9+相邻成团", "9+相鄰成團", "9個以上の連結群", "9개 이상 연결 그룹"], "9+ ANYWHERE COUNT": ["9+全盘计数", "9+全盤計數", "9個以上どこでも", "9개 이상 전체 집계"], "1 POKER HANDS": ["1手配对牌型", "1手配對牌型", "1ハンドの役判定", "1패 족보 판정"], "2 POKER HANDS": ["2手配对牌型", "2手配對牌型", "2ハンドの役判定", "2패 족보 판정"], "3 POKER HANDS": ["3手配对牌型", "3手配對牌型", "3ハンドの役判定", "3패 족보 판정"], "4 POKER HANDS": ["4手配对牌型", "4手配對牌型", "4ハンドの役判定", "4패 족보 판정"]});
Object.assign(translations,{"A path win starts the harvest.": ["路径中奖后开始采收。", "路徑中獎後開始採收。", "経路の当選で収穫が始まります。", "경로 당첨 시 수확이 시작됩니다."], "Refill only the longest winning path in place. Stop on no path win or after four refills; multipliers 1x, 2x, 3x, 4x.": ["仅原位补充最长中奖路径；无路径中奖或补充四次后停止，倍率依次为1、2、3、4倍。", "僅原位補充最長中獎路徑；無路徑中獎或補充四次後停止，倍率依次為1、2、3、4倍。", "最長の当選経路だけを補充。当選なし又は4回で終了。倍率は1、2、3、4倍。", "가장 긴 당첨 경로만 제자리 보충. 미당첨 또는 4회 후 종료. 배수는 1·2·3·4배."], "Coins become one randomly selected regular symbol. Evaluate any-start Ways; pay only the award increase.": ["金币变为随机选定的同一种普通符号；按任意起列组合判奖，仅支付增加部分。", "金幣變為隨機選定的同一種普通符號；按任意起列組合判獎，僅支付增加部分。", "コインを同じ通常図柄に変換。任意始点ウェイズで再判定し増加分のみ支払い。", "코인을 같은 일반 심볼로 변환. 임의 시작 웨이로 재판정하여 증가분만 지급."], "A count-anywhere award starts an upward refill.": ["全盘计数中奖后开始向上补充。", "全盤計數中獎後開始向上補充。", "全盤の個数当選で上向き補充を開始。", "전체 개수 당첨 시 위로 보충합니다."], "A payline win starts tumbles.": ["固定线中奖后开始下落补充。", "固定線中獎後開始下落補充。", "固定ライン当選で落下補充を開始。", "고정 라인 당첨 시 낙하 보충합니다."], "A collector award starts the burst.": ["收集奖励触发爆破补充。", "收集獎勵觸發爆破補充。", "収集の当選で破裂補充を開始。", "수집 당첨 시 폭발 보충합니다."], "A connected-cluster win starts three deliveries.": ["相邻成团中奖后开始三次运送。", "相鄰成團中獎後開始三次運送。", "連結群の当選で3回の配送を開始。", "연결 그룹 당첨 시 운송 3회를 시작합니다."], "Move reels left and draw a new rightmost reel. Recount orthogonally connected matching groups; multipliers 1x, 2x, 3x.": ["转轴左移并补充最右列；重新计算上下左右相连的同符号群，倍率为1、2、3倍。", "轉軸左移並補充最右列；重新計算上下左右相連的同符號群，倍率為1、2、3倍。", "列を左へ移動し右端を補充。上下左右に連結する同図柄を再判定。1、2、3倍。", "릴을 왼쪽으로 옮기고 오른쪽을 보충. 상하좌우 같은 심볼 그룹을 재판정. 1·2·3배."], "Each free board uses any-start Ways. Its multiplier is 2x plus its WILD count, capped at 5x.": ["每个免费盘面按任意起列组合判奖；倍率为2加百搭个数，最高5倍。", "每個免費盤面按任意起列組合判獎；倍率為2加百搭個數，最高5倍。", "無料盤面は任意始点ウェイズで判定。倍率は2＋ワイルド数、最大5倍。", "무료 보드는 임의 시작 웨이로 판정. 배수는 2+와일드 수, 최대 5배."], "A Ways win starts two key respins.": ["组合中奖后开始两次钥匙重转。", "組合中獎後開始兩次鑰匙重轉。", "ウェイズ当選で鍵リスピン2回を開始。", "웨이 당첨 시 열쇠 재회전 2회를 시작합니다."], "All cells in winning paths become WILD. Re-evaluate the board and pay only the award increase.": ["中奖路径格子变为百搭，重新判奖，仅支付增加部分。", "中獎路徑格子變為百搭，重新判獎，僅支付增加部分。", "当選経路のマスをワイルドに変更。再判定し増加分のみ支払い。", "당첨 경로 칸을 와일드로 변경. 재판정하여 증가분만 지급."], "Starting WILDs are held. New WILDs remain held for later free spins. Count matching symbols anywhere after each spin.": ["保留初始百搭，新增百搭在后续免费转中保留；每次按全盘同符号数量判奖。", "保留初始百搭，新增百搭在後續免費轉中保留；每次按全盤同符號數量判獎。", "初期と新規ワイルドを以後の無料回転で保持。毎回全盤の同図柄数で判定。", "초기 및 새 와일드를 이후 무료 회전에도 유지. 매번 전체 같은 심볼 수로 판정."], "All coins become one randomly selected regular symbol. Evaluate connected clusters; pay only the award increase.": ["所有金币变为随机选定的同一种普通符号；按相邻成团判奖，仅支付增加部分。", "所有金幣變為隨機選定的同一種普通符號；按相鄰成團判獎，僅支付增加部分。", "全コインを同じ通常図柄に変換。連結群で再判定し増加分のみ支払い。", "모든 코인을 같은 일반 심볼로 변환. 연결 그룹 재판정 후 증가분만 지급."], "A collector award starts lotus cascades.": ["收集奖励触发莲花连消。", "收集獎勵觸發蓮花連消。", "収集の当選で蓮の連鎖を開始。", "수집 당첨 시 연꽃 연쇄를 시작합니다."], "The most numerous regular symbol advances one tier per step, up to three steps or the highest tier. Re-evaluate variable-height Ways; pay only award increases.": ["数量最多的普通符号每步升一级，最多三步或到最高级；按可变高度组合重新判奖，仅支付增加部分。", "數量最多的普通符號每步升一級，最多三步或到最高級；按可變高度組合重新判獎，僅支付增加部分。", "最多の通常図柄を各段階1ランク昇格。最大3段階又は最高ランクまで。可変高さウェイズの増加分のみ支払い。", "가장 많은 일반 심볼을 단계마다 승급. 최대 3단계 또는 최고 등급. 가변 높이 웨이의 증가분만 지급."], "WILDs stay fixed. New WILDs reset chances to three, with a ten-respin limit. Each board pays its fixed paylines.": ["百搭固定，新增百搭重置为三次机会，最多十次重转；每盘按固定线判奖。", "百搭固定，新增百搭重置為三次機會，最多十次重轉；每盤按固定線判獎。", "ワイルドを固定。新規で残り3回に戻り最大10回。各盤面は固定ラインで判定。", "와일드 고정. 새 와일드는 기회를 3회로 초기화, 최대 10회. 각 보드는 고정 라인 판정."], "Draw a fresh board, choose one reel at random and copy it to all reels. Evaluate any-start Ways on the resulting board.": ["生成新盘面，随机选择一列复制到所有列；按任意起列组合判奖。", "生成新盤面，隨機選擇一列複製到所有列；按任意起列組合判獎。", "新盤面のランダムな1列を全列に複製。任意始点ウェイズで判定。", "새 보드의 무작위 한 릴을 모든 릴에 복사. 임의 시작 웨이로 판정."], "A count-anywhere award starts ember cascades.": ["全盘计数中奖后开始余烬连消。", "全盤計數中獎後開始餘燼連消。", "全盤の個数当選で残り火の連鎖を開始。", "전체 개수 당첨 시 잿불 연쇄를 시작합니다."], "An orthogonally connected group of seven or more matching symbols starts PEARL CASCADE.": ["至少七个上下左右相连的同符号触发珍珠连消。", "至少七個上下左右相連的同符號觸發珍珠連消。", "同図柄7個以上の上下左右の連結で真珠連鎖を開始。", "상하좌우 같은 심볼 7개 이상 연결 시 진주 연쇄 시작."], "Remove winning cells; survivors fall in their own column, then refill. New boards pay at 2x, 3x, 4x, 5x, 6x and 7x.": ["中奖格移除，其余符号在原列下落并补充；新盘面依次为2、3、4、5、6、7倍。", "中獎格移除，其餘符號在原列下落並補充；新盤面依次為2、3、4、5、6、7倍。", "当選マスを消去し同じ列で落下・補充。新盤面は順に2、3、4、5、6、7倍。", "당첨 칸 제거 후 같은 열에서 낙하·보충. 새 보드는 2·3·4·5·6·7배."], "Stop at the first board without a qualifying cluster or after six drops. No additional bet; scatters pay only on the starting board.": ["无有效连团或下落六次后停止。不追加下注；分散符号只在初始盘面支付。", "無有效連團或下落六次後停止。不追加下注；分散符號只在初始盤面支付。", "有効な群なし又は6回で終了。追加ベットなし。スキャターは初期盤面のみ支払い。", "유효 그룹 없음 또는 6회 낙하 후 종료. 추가 베팅 없음. 스캐터는 초기 보드에서만 지급."], "Five free respins on a six-reel cabinet. Valid upward-path wins pay each time; new WILDs do not retrigger or join the procession.": ["六列柜机进行五次免费重转；每次结算有效上行路径，新增百搭不再触发也不加入巡游。", "六列櫃機進行五次免費重轉；每次結算有效上行路徑，新增百搭不再觸發也不加入巡遊。", "6列で無料リスピン5回。毎回上向き経路を判定。新ワイルドは再発動せず行進にも参加しません。", "6릴에서 무료 재회전 5회. 매번 상향 경로 판정. 새 와일드는 재발동·행진 참여 없음."]});
Object.assign(translations,UI_LOCALE_ADDITIONS,CLOCKWORK_LOCALE);
// Normalize both sides: wrapped labels and translated templates must share one key.
const normalizeTranslationKey=(value:string):string=>value.replace(/\s+/g,' ').trim();
Object.assign(translations,FESTIVAL_LOCALE,SYMPHONY_LOCALE);
const normalizedTranslations=new Map<string,readonly string[]>();
for(const [key,value] of Object.entries(translations))normalizedTranslations.set(normalizeTranslationKey(key),value);
const patterns=Array.from(normalizedTranslations.keys()).filter(k=>k.includes('{')).sort((a,b)=>b.length-a.length).map(key=>{
 const slots:number[]=[];
 const expression=key.split(/(\{\d+\})/).map(part=>{const slot=part.match(/^\{(\d+)\}$/);if(slot){slots.push(Number(slot[1]));return '(.+?)';}return part.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');}).join('');
 return {key,slots,re:new RegExp('^'+expression+'$')};
});
export function tr(value:string):string {
 if(selected==='en')return value;
 const key=normalizeTranslationKey(value),index=LANGUAGES.findIndex(l=>l.code===selected)-1;
 const exact=normalizedTranslations.get(key);if(exact)return exact[index]||value;
 if(value.includes('\n'))return value.split('\n').map(part=>tr(part)).join('\n');
 for(const pattern of patterns){
  // A short fragment pattern (e.g. `Base {0}`) must not consume the
  // remaining ` · Gift {1}` as its argument. Prefer complete phrases.
  if(key.includes(' · ')&&!pattern.key.includes(' · '))continue;
  const match=key.match(pattern.re);if(match){const values:Record<number,string>={};pattern.slots.forEach((slot,i)=>values[slot]=match[i+1]);return (normalizedTranslations.get(pattern.key)?.[index]||value).replace(/\{(\d+)\}/g,(_,slot)=>values[Number(slot)]??'');}}
 // Compose complete localized fragments; do not feed partially translated phrases back into a pattern.
 if(key.includes(' · '))return key.split(' · ').map(part=>tr(part)).join(' · ');
 return value;
}

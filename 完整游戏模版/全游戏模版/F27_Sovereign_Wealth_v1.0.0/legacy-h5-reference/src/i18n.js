export const languages=Object.freeze([
  {id:'en',label:'English'},{id:'zh-CN',label:'简体中文'},{id:'es',label:'Español'},{id:'ja',label:'日本語'},
]);
const en={
  loading:'Opening the Royal Treasury…',guest:'Continue as Guest',apple:'Sign in with Apple',appleUnavailable:'Apple sign-in is not connected in this local build.',agree:'I agree to the Terms and Privacy Policy.',terms:'Terms',privacy:'Privacy',
  home:'Lobby',shop:'Treasury Shop',gifts:'Rewards',rank:'Royal Ranking',profile:'Account',mail:'Royal Mail',enter:'ENTER',balance:'BALANCE',bet:'TOTAL BET',lastWin:'LAST WIN',spin:'SPIN',auto:'AUTO',autoOn:'AUTO ON',rules:'RULES',history:'HISTORY',back:'LOBBY',sound:'SOUND',
  daily:'Daily Treasury',claim:'CLAIM',claimed:'CLAIMED',example:'Sample rival',you:'You',rename:'Rename',language:'Language',settings:'Settings',logout:'Log out',save:'Save',close:'Close',purchaseNotice:'StoreKit purchases are not connected in this local build.',
  insufficient:'Not enough coins.',already:'Already claimed today.',win:'WIN',bigWin:'ROYAL JACKPOT',tapClose:'Tap to continue',modeReady:'Treasury ready',retry:'Retry',returnLobby:'Return to lobby',
  'royal-mint':'Royal Mint','jade-treasury':'Jade Treasury','diamond-foundry':'Diamond Foundry','crown-wheel':'Crown Wheel',
  'royal-mint-rule':'3×3 reels · 5 fixed lines · Wild · a losing center pair may receive one mechanical nudge.',
  'jade-treasury-rule':'5×4 reels · 1024 ways · a Wild expands to cover its complete reel before evaluation.',
  'diamond-foundry-rule':'6×5 grid · 5+ touching symbols pay · wins dissolve and the multiplier rises each cascade.',
  'crown-wheel-rule':'5×3 reels · 20 fixed lines · 3+ Wheel Scatters trigger a weighted royal bonus wheel.',
  privacyBody:'This local template stores guest progress on this device. No production analytics, Apple account data or payment data is transmitted.',
  termsBody:'Coins in this template are virtual demonstration credits with no cash value. Production services and commerce require separate integration and review.',
  navHome:'Lobby',navShop:'Shop',navRewards:'Rewards',navRank:'Ranking',navAccount:'Account',decreaseBet:'Decrease bet',increaseBet:'Increase bet',recentSpins:'Recent Spins',noSpins:'No spins in this session.',betShort:'BET',reducedMotion:'Reduced motion',on:'ON',off:'OFF',spins:'Spins',bestWin:'Best win',totalWin:'Total win',reelsInMotion:'Reels in motion',royalNudge:'Royal nudge',expandingWild:'Expanding Wild',cascade:'Cascade',scatterTreasure:'Scatter Treasure',royalWealthWheel:'Royal Wealth Wheel',invalidName:'Enter a valid name.',rulesNote:'Fixed-line bets are divided equally across paylines. Ways and cluster awards use the total bet.',
  'royal-mint-kicker':'Mint Treasury','jade-treasury-kicker':'Jade Court','diamond-foundry-kicker':'Diamond Atelier','crown-wheel-kicker':'Crown Chamber',
};
const zh={
  loading:'正在开启皇家金库…',guest:'游客进入',apple:'通过 Apple 登录',appleUnavailable:'本地版本尚未接通 Apple 登录。',agree:'我同意条款与隐私政策。',terms:'使用条款',privacy:'隐私政策',
  home:'大厅',shop:'财富商店',gifts:'奖励',rank:'皇家排行',profile:'账户',mail:'皇家信件',enter:'进入',balance:'余额',bet:'总下注',lastWin:'上局奖励',spin:'旋转',auto:'自动',autoOn:'自动中',rules:'规则',history:'记录',back:'大厅',sound:'声音',
  daily:'每日金库',claim:'领取',claimed:'已领取',example:'示例对手',you:'你',rename:'修改名称',language:'语言',settings:'设置',logout:'退出登录',save:'保存',close:'关闭',purchaseNotice:'本地版本尚未接通 StoreKit 购买。',
  insufficient:'金币不足。',already:'今天已经领取。',win:'获奖',bigWin:'皇家大奖',tapClose:'点击继续',modeReady:'金库已准备',retry:'重试',returnLobby:'返回大厅',
  'royal-mint':'皇家铸币厂','jade-treasury':'玉石宝库','diamond-foundry':'钻石锻造','crown-wheel':'皇冠转轮',
  'royal-mint-rule':'3×3 转轴、5 条固定线、Wild；未中奖且中线形成对子时可能获得一次机械微调。',
  'jade-treasury-rule':'5×4 转轴、1024 ways；Wild 在结算前扩展为整列。',
  'diamond-foundry-rule':'6×5 格；5 个以上相邻同图案中奖，消除后补位并逐次提高倍率。',
  'crown-wheel-rule':'5×3 转轴、20 条固定线；3 个以上转轮 Scatter 触发加权皇家转轮奖励。',
  privacyBody:'本地模板仅在本设备保存游客进度，不传输正式分析数据、Apple 账户数据或支付数据。',termsBody:'模板内金币仅为无现金价值的演示积分，正式服务和交易需另行接入并验收。',
  navHome:'大厅',navShop:'商店',navRewards:'奖励',navRank:'排行',navAccount:'账户',decreaseBet:'减少下注',increaseBet:'增加下注',recentSpins:'最近旋转',noSpins:'本次尚无旋转记录。',betShort:'下注',reducedMotion:'减少动态',on:'开启',off:'关闭',spins:'旋转次数',bestWin:'最高奖励',totalWin:'累计奖励',reelsInMotion:'转轴旋转中',royalNudge:'皇家微调',expandingWild:'扩展 Wild',cascade:'连续消除',scatterTreasure:'Scatter 宝藏',royalWealthWheel:'皇家财富转轮',invalidName:'请输入有效名称。',rulesNote:'固定线玩法会将总下注平均分配至各赔付线；Ways 与连簇玩法按总下注结算。',
  'royal-mint-kicker':'铸币金库','jade-treasury-kicker':'翡翠御苑','diamond-foundry-kicker':'钻石工坊','crown-wheel-kicker':'皇冠殿堂',
};
const es={
  loading:'Abriendo el Tesoro Real…',guest:'Continuar como invitado',apple:'Iniciar sesión con Apple',appleUnavailable:'Apple no está conectado en esta versión local.',agree:'Acepto los Términos y la Política de privacidad.',terms:'Términos',privacy:'Privacidad',
  home:'Vestíbulo',shop:'Tienda del Tesoro',gifts:'Premios',rank:'Clasificación Real',profile:'Cuenta',mail:'Correo Real',enter:'ENTRAR',balance:'SALDO',bet:'APUESTA TOTAL',lastWin:'ÚLTIMO PREMIO',spin:'GIRAR',auto:'AUTO',autoOn:'AUTO ACTIVO',rules:'REGLAS',history:'HISTORIAL',back:'VESTÍBULO',sound:'SONIDO',
  daily:'Tesoro diario',claim:'COBRAR',claimed:'COBRADO',example:'Rival de muestra',you:'Tú',rename:'Cambiar nombre',language:'Idioma',settings:'Ajustes',logout:'Cerrar sesión',save:'Guardar',close:'Cerrar',purchaseNotice:'StoreKit no está conectado en esta versión local.',
  insufficient:'No hay monedas suficientes.',already:'Ya se cobró hoy.',win:'PREMIO',bigWin:'GRAN PREMIO REAL',tapClose:'Toca para continuar',modeReady:'Tesoro listo',retry:'Reintentar',returnLobby:'Volver',
  'royal-mint':'Casa de Moneda','jade-treasury':'Tesoro de Jade','diamond-foundry':'Forja de Diamantes','crown-wheel':'Rueda de la Corona',
  'royal-mint-rule':'Rodillos 3×3, 5 líneas fijas, Wild y un posible ajuste mecánico tras una pareja central perdedora.',
  'jade-treasury-rule':'Rodillos 5×4, 1024 formas; el Wild cubre todo su rodillo antes del cálculo.',
  'diamond-foundry-rule':'Cuadrícula 6×5; grupos de 5+ pagan, desaparecen y aumentan el multiplicador.',
  'crown-wheel-rule':'Rodillos 5×3, 20 líneas; 3+ Scatters activan la rueda real.',
  privacyBody:'Esta plantilla local guarda el progreso de invitado en este dispositivo. No transmite datos de Apple ni pagos.',termsBody:'Las monedas son créditos de demostración sin valor en efectivo. Los servicios reales requieren integración independiente.',
  navHome:'Sala',navShop:'Tienda',navRewards:'Premios',navRank:'Ranking',navAccount:'Cuenta',decreaseBet:'Reducir apuesta',increaseBet:'Aumentar apuesta',recentSpins:'Giros recientes',noSpins:'Aún no hay giros en esta sesión.',betShort:'APUESTA',reducedMotion:'Reducir movimiento',on:'SÍ',off:'NO',spins:'Giros',bestWin:'Mejor premio',totalWin:'Premio total',reelsInMotion:'Rodillos en movimiento',royalNudge:'Ajuste real',expandingWild:'Wild expansivo',cascade:'Cascada',scatterTreasure:'Tesoro Scatter',royalWealthWheel:'Ruleta de Riqueza Real',invalidName:'Introduce un nombre válido.',rulesNote:'La apuesta se reparte entre las líneas fijas. Ways y grupos usan la apuesta total.',
  'royal-mint-kicker':'Tesoro de la Casa de Moneda','jade-treasury-kicker':'Corte de Jade','diamond-foundry-kicker':'Taller de Diamantes','crown-wheel-kicker':'Cámara de la Corona',
};
const ja={
  loading:'王室金庫を開いています…',guest:'ゲストで続ける',apple:'Appleでサインイン',appleUnavailable:'このローカル版はAppleログイン未接続です。',agree:'利用規約とプライバシーポリシーに同意します。',terms:'利用規約',privacy:'プライバシー',
  home:'ロビー',shop:'宝物ショップ',gifts:'報酬',rank:'王室ランキング',profile:'アカウント',mail:'王室メール',enter:'入る',balance:'残高',bet:'合計ベット',lastWin:'前回の賞金',spin:'スピン',auto:'オート',autoOn:'オート中',rules:'ルール',history:'履歴',back:'ロビー',sound:'サウンド',
  daily:'毎日の金庫',claim:'受取',claimed:'受取済み',example:'サンプル対戦者',you:'あなた',rename:'名前変更',language:'言語',settings:'設定',logout:'ログアウト',save:'保存',close:'閉じる',purchaseNotice:'このローカル版はStoreKit未接続です。',
  insufficient:'コインが足りません。',already:'本日は受取済みです。',win:'WIN',bigWin:'ロイヤル大賞',tapClose:'タップして続ける',modeReady:'金庫の準備完了',retry:'再試行',returnLobby:'ロビーへ',
  'royal-mint':'王室造幣局','jade-treasury':'翡翠の宝庫','diamond-foundry':'ダイヤ工房','crown-wheel':'王冠ホイール',
  'royal-mint-rule':'3×3、固定5ライン、Wild。中央のペアで外れた時に機械式ナッジの可能性があります。',
  'jade-treasury-rule':'5×4、1024 ways。Wildは判定前にリール全体へ拡張します。',
  'diamond-foundry-rule':'6×5。隣接する同じ絵柄5個以上で配当、消去後に倍率が上昇します。',
  'crown-wheel-rule':'5×3、固定20ライン。Wheel Scatter 3個以上で王室ホイールを開始します。',
  privacyBody:'ローカル版はゲスト進行を端末内に保存します。Appleアカウントや決済情報は送信しません。',termsBody:'コインは換金できないデモ用クレジットです。本番サービスは別途実装と審査が必要です。',
  navHome:'ロビー',navShop:'ショップ',navRewards:'報酬',navRank:'順位',navAccount:'アカウント',decreaseBet:'ベットを下げる',increaseBet:'ベットを上げる',recentSpins:'最近のスピン',noSpins:'このセッションの履歴はありません。',betShort:'ベット',reducedMotion:'動きを減らす',on:'オン',off:'オフ',spins:'スピン数',bestWin:'最高配当',totalWin:'総配当',reelsInMotion:'リール回転中',royalNudge:'ロイヤルナッジ',expandingWild:'拡張ワイルド',cascade:'カスケード',scatterTreasure:'スキャッター宝箱',royalWealthWheel:'ロイヤル・ウェルス・ホイール',invalidName:'有効な名前を入力してください。',rulesNote:'固定ラインは総ベットを各ラインに均等配分します。Ways とクラスターは総ベットで計算します。',
  'royal-mint-kicker':'造幣宝庫','jade-treasury-kicker':'翡翠宮','diamond-foundry-kicker':'ダイヤ工房','crown-wheel-kicker':'王冠の間',
};
const dictionaries={'en':en,'zh-CN':zh,'es':es,'ja':ja};
export function t(key,lang='en',vars={}){let value=dictionaries[lang]?.[key]??en[key]??key;for(const [name,replacement] of Object.entries(vars))value=value.replaceAll(`{${name}}`,String(replacement));return value;}

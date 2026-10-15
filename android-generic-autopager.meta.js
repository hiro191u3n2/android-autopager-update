// ==UserScript==
// @name         Android 汎用オートページャー
// @namespace    https://example.local/userscripts
// @version      6.46.0
// @description  服ブランド一覧のスクロール負荷を削減。商品詳細の誤ページ探索防止・CITYHILLサムネイルのタップ補助。Yahooリアルタイム検索の「もっと見る」をスクロールで自動読込。公式ボタン利用・二重読込防止・エラー時の手動操作を維持。CITYHILLのpno実リンク・表示枠なし要素・取得先レイアウト照合を修正。追加失敗時は商品末尾の実リンクへ自動遷移。現在ページ番号の長押しでローカル診断。CITYHILL予約一覧の検索URL型ページ送り・番号のみ/装飾矢印・色違いcc・商品末尾/内部スクロール検知を修正。CITYHILL検索一覧のスマホ用URL・相対商品リンク・ページナビ・JS式次ページ・遅延描画・取得失敗時の再試行に対応。PAL CLOSET・atomicboxx・CITYHILL商品一覧の自動ページ追加。色違い維持・複数検索条件・動的商品表示に対応。Rlab store（ROJITA）の商品一覧末尾で次ページを自動追加。専用ページ送り・data-layzr画像・重複防止・最終ページ判定に対応。汎用オートページャー。固定URLからの直接更新に対応。Google追加ページ内の全商品カードを価格要素から特定し、実ページ配色の隔離レイアウトと検索結果区切りで重なり・色ずれ・連結表示を防止。「他の人はこちらも検索」非表示、YouTube原題復元・複数画像対策、PimEyes全画面日本語化・Android画像選択のフォーカス不具合修正、Yahooニュース全文表示・一覧限定UA・記事動画のEdge互換UAと公式プレイヤー準備までの前面サムネ表示・ニュース一覧先行描画と初期監視軽量化・初回一括整理による高速表示・可変案内枠非表示・記事一覧の画像拡大崩れ防止・リアルタイム検索上部キャンペーン枠非表示、スマホダイジェスト・Buzzap専用の解析完了待機・定期監視・3経路取得・継続再試行対応、Buzzapのフォロー案内枠を丸ごと非表示。
// @downloadURL  https://hiro191u3n2.github.io/android-autopager-update/android-generic-autopager.user.js
// @updateURL    https://hiro191u3n2.github.io/android-autopager-update/android-generic-autopager.meta.js
// @homepageURL  https://hiro191u3n2.github.io/android-autopager-update/
// @match        http://*/*
// @match        https://*/*
// @run-at       document-start
// @grant        GM_xmlhttpRequest
// @grant        GM.xmlHttpRequest
// @grant        unsafeWindow
// @connect      www.youtube.com
// @connect      youtube.com
// @connect      buzzap.jp
// @connect      www.buzzap.jp
// ==/UserScript==

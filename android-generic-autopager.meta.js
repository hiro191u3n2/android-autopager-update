// ==UserScript==
// @name         Android 汎用オートページャー
// @namespace    https://example.local/userscripts
// @version      6.33.0
// @description  汎用オートページャー。固定URLからの直接更新に対応。Google追加ページ内の全商品カードを価格要素から特定し、実ページ配色の隔離レイアウトと検索結果区切りで重なり・色ずれ・連結表示を防止。「他の人はこちらも検索」非表示、YouTube原題復元・複数画像対策、PimEyes全画面日本語化・Android画像選択のフォーカス不具合修正、Yahooニュース全文表示・一覧限定UA・記事動画のEdge互換UAと公式プレイヤー準備までの前面サムネ表示・ニュース一覧先行描画と初期監視軽量化・初回一括整理による高速表示・可変案内枠非表示・記事一覧の画像拡大崩れ防止・リアルタイム検索上部キャンペーン枠非表示、スマホダイジェスト・Buzzap専用の解析完了待機・定期監視・3経路取得・継続再試行対応。
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

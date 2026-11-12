// ==UserScript==
// @name         Android 汎用オートページャー
// @namespace    https://example.local/userscripts
// @version      6.65.0
// @description  Googleのページ境界でスクロールが止まる待ち時間を軽減。次の1ページを先に準備し、閲覧位置に応じて先読みを継続。検索語の変更・一時停止・画面離脱時の古い結果の追加を防止。Google追加結果の接したカードと、PDF表示・折返し装飾を含むURL行で区切り補修から漏れる条件を修正。既存の余白内で描画し、結果の位置と高さを維持。Googleの同一枠内の検索結果の区切りを補修。自動追加中の末尾案内を整理し、YouTubeの見出しを追加前に確定。Google診断ログ機能を削除。Google追加ページの商品カードの横並び幅、角丸背景、星評価、在庫アイコンとCSSの区切りを保持。大きなページでも表示の引き継ぎを中止せず、非表示部分を省いて処理を分割。Google追加結果の区切り補修が背景色の違いだけで中止される問題を修正。既存の隙間へ明示的に描画し、細い枠線と結果の配置を維持。Google検索の一覧直下に並ぶ結果の区切り欠落を修正。既存の余白へ区切りを描画し、表示間隔を維持。同じ見出し内の親ドメインのサイト名とサブドメインURLの二重計数を修正。Google追加ページの同じ枠内にある独立した検索結果の区切りを補修。サイトURLとリンクから境界を判定し、見出し形式や大きなページにも対応。複数結果を料金から商品1枚にまとめる誤変換を防止。Google検索語の再編集・日本語変換時の重さを修正。入力中の不要な走査を休止し、候補更新とキーボード表示による全結果再走査を除外。長い処理を分割し、検索確定後に自動再開。Google検索が白いままになる不具合を修正。表示設定の書き換え競合を制限し、ページ全体・検索欄・結果一覧の誤非表示を防止。補正案内・現在地帯・AI概要の非表示を継続。Google追加ページの動画・商品・記事カードの表示崩れを修正。取得元の配置・配色・非表示状態を引き継ぎ、画像・再生ボタン・説明文の重なりと記事の誤変換を防止。服ブランド一覧のスクロール負荷を削減。商品詳細の誤ページ探索防止・CITYHILLサムネイルのタップ補助。Yahooリアルタイム検索の「もっと見る」をスクロールで自動読込。公式ボタン利用・二重読込防止・エラー時の手動操作を維持。CITYHILLのpno実リンク・表示枠なし要素・取得先レイアウト照合を修正。追加失敗時は商品末尾の実リンクへ自動遷移。現在ページ番号の長押しでローカル診断。CITYHILL予約一覧の検索URL型ページ送り・番号のみ/装飾矢印・色違いcc・商品末尾/内部スクロール検知を修正。CITYHILL検索一覧のスマホ用URL・相対商品リンク・ページナビ・JS式次ページ・遅延描画・取得失敗時の再試行に対応。PAL CLOSET・atomicboxx・CITYHILL商品一覧の自動ページ追加。色違い維持・複数検索条件・動的商品表示に対応。Rlab store（ROJITA）の商品一覧末尾で次ページを自動追加。専用ページ送り・data-layzr画像・重複防止・最終ページ判定に対応。汎用オートページャー。固定URLからの直接更新に対応。Google追加ページ内の全商品カードを価格要素から特定し、実ページ配色の隔離レイアウトと検索結果区切りで重なり・色ずれ・連結表示を防止。「他の人はこちらも検索」非表示、YouTube原題復元・複数画像対策、PimEyes全画面日本語化・Android画像選択のフォーカス不具合修正、Yahooニュース全文表示・一覧限定UA・記事動画のEdge互換UAと公式プレイヤー準備までの前面サムネ表示・ニュース一覧先行描画と初期監視軽量化・初回一括整理による高速表示・可変案内枠非表示・記事一覧の画像拡大崩れ防止・リアルタイム検索上部キャンペーン枠非表示、スマホダイジェスト・Buzzap専用の解析完了待機・定期監視・3経路取得・継続再試行対応、Buzzapのフォロー案内枠を丸ごと非表示。
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

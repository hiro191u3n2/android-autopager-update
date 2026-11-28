import {recipePage} from '../fixtures/google-recipes.mjs';
import {featuredGridPage} from '../fixtures/google-featured-grid.mjs';
import {priceToggleCaptionPage} from '../fixtures/google-price-accordions.mjs';
export const terms=`東京駅
reCAPTCHA とは
新宿 ランチ
ポケモンユナイト
象印 加湿器
サーモンキャンディ
渋谷 イルミネーション
Galaxy カメラ
羽田空港 国内線
通常と異なるトラフィック 意味
いちご大福
スチーム加湿器 掃除
木村拓哉 インスタ
海の生き物
厚底 ブーツ
ちいかわ ハチワレ
日本の美術大学
京都 紅葉
NHK ニュース
Nintendo Switch 体験版
あじさい
福岡 天神 カフェ
Android 17
クリームシチュー 作り方
バスケットボール
ポケモン 攻略
札幌 雪まつり
山手線 路線図
1ドル 何円
紅茶 おすすめ
ニット ワンピース
銀座 映画館
新幹線 のぞみ
スパゲティ ナポリタン
AI とは
レトロゲーム
サンリオピューロランド
東京タワー 高さ
大晦日 イベント
東京駅 地下街
ロボットではありません 表示
before you continue 和訳
英語 発音
アニメ 聖地巡礼
チーズケーキ 簡単
ボカロ 人気曲
スニーカー 白
Spotify プレイリスト
犬 柴犬 写真
鳥の種類
横浜 赤レンガ倉庫
成田空港 時刻表
サッカー 日本代表
オムライス レシピ
アプリ 通知 設定
ポートレート レンズ
富士山 天気
冬至 日の入り
100均 収納
ディズニー映画
JavaScript 入門
C++ 入門
C# 文字列
A&B 意味
"Nursery Rhyme"
site:go.jp 博物館
Google Maps 経路
雨雲レーダー
evelyn コート
ショートケーキ 🍰
台北 観光
パスタ トマト
東京都立図書館
観葉植物 育て方
折りたたみ傘 軽量
ワイヤレスイヤホン
ドジャース 試合
天体観測 望遠鏡
水族館 関東
都内 イルミ
SwiftKey 日本語
神田 古本屋
多摩美術大学 卒展
スコーン 作り方
映画 上映時間
博多ラーメン
初詣 東京
路線図 PDF
秋葉原 ゲームセンター
高速バス 福岡
すみだ水族館
Android WebView
お好み焼き 広島風
ベランダ ハーブ
室内 加湿 方法
豆柴 写真
コンデジ おすすめ
ゲーム音楽 オーケストラ
丸の内 カフェ
半角＋全角 スペース`.split('\n');
if(terms.length!==100||new Set(terms).size!==100)throw Error('100 unique queries required');
const esc=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
const qr=(s,n)=>'/search?'+new URLSearchParams({q:s,start:n}).toString().replaceAll('&','&amp;');
export function fixture(url){
 const q=url.searchParams.get('q')||'', at=terms.indexOf(q), variant=at%10, raw=Number(url.searchParams.get('start')||0), start=Math.min(40,raw), t=esc(q), p=start/10+1;
 const shapes=['article','div','section'], tag=shapes[Math.abs(at)%3]; const cls=tag==='div'?'Ww4FFb':'MjjYud';
 const card=(key,label,body)=>'<'+tag+' class="'+cls+'" data-qa-item="'+key+'"><div><cite>https://info.example</cite><a href="https://info.example/'+key+'"><h3>'+label+'</h3></a></div><p>'+body+'</p></'+tag+'>';
 const extra=Array.from({length:variant===3?8:1},(_,i)=>card('common-'+i,'共通の参考資料 '+i,'各ページに共通して掲載される参考資料の説明文です。')).join('');
 const results=Array.from({length:3},(_,i)=>card('item-'+p+'-'+i,t+' の案内 '+p+'-'+i,'詳しい情報と参考資料が掲載されています。検索語は '+t+' です。')).join('');
 let module='',style='';
 const pick=variant===4?featuredGridPage:variant===5?recipePage:variant===6?priceToggleCaptionPage:null;
 if(pick){const base=pick(variant===6?(start%30):start);module=base.split('<div id="rso">')[1].split('</div></main>')[0];style=(base.match(/<style>([\s\S]*?)<\/style>/)||[])[1]||''; }
 if(variant===7)module='<section><h2>動画</h2><a href="https://video.example/'+p+'">動画一覧 '+p+'</a></section>';
 const nav=variant===2?'<nav><a href="'+qr(q+' 関連',start+10)+'">関連の検索結果</a><a href="'+qr(q,start+30)+'">4</a><a href="'+qr(q,start+10)+'">次の結果</a></nav>':'<nav><a id="pnnext" href="'+qr(q,start+10)+'">次へ</a></nav>';
 return '<!doctype html><html lang=ja><head><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><title>'+t+' - Google 検索</title><style>'+style+'body{margin:0;font:16px sans-serif} [data-qa-item]{display:block;padding:18px 12px;border-bottom:5px solid #eee}h3{margin:8px 0}</style></head><body><main id="search"><div id="rso">'+extra+results+module+'</div></main>'+nav+'</body></html>';
}

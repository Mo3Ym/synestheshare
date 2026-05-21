---
name: project-synestheshare
description: SynestheShare プロジェクトの構成・実装状況・未解決問題のまとめ
metadata:
  type: project
---

# SynestheShare プロジェクト引き継ぎメモ

## プロジェクト構成

- **サイト**: 共感覚（文字に色を感じる感覚）の診断・シェアサービス
- **ホスティング**: Cloudflare Pages（GitHub リポジトリと自動連携）
- **URL**: https://synestheshare.pages.dev
- **DB**: Firebase Firestore（投票・統計）

### 主要ファイル
```
index.html          トップページ
alphabet.html       アルファベット診断ページ
number.html         数字診断ページ
subject.html        教科診断ページ
result.html         診断結果ページ（メイン）
functions/
  api/og.js         OGP画像生成（Cloudflare Pages Function）
  result.html.js    result.htmlのOGPメタタグをサーバー側で書き換え
  result.js         （用途不明、同様のCOLOR_TYPESを持つ）
  _middleware.js    ミドルウェア（現状は result.html.js と重複）
wrangler.toml       Cloudflare Pages設定
package.json        npm依存（現在は空）
```

---

## 実装済み内容

### OGP メタタグの動的書き換え（result.html.js）
- `result.html?r=XXX&mode=10` へのリクエストをインターセプト
- `HTMLRewriter` で `og:image`, `og:title`, `twitter:image` 等を書き換え
- OGP画像URLは `/api/og?r=XXX&mode=10` を指す
- タイトルにはカラータイプ名（SUNSET TYPE 等）が入る

### OGP画像生成（functions/api/og.js）
- 現在の実装：**純粋JS + PNGエンコーダー**（npm依存ゼロ）
- 描画内容：
  - タイプ別blobグラデーション背景
  - カラードット（直径88px、中に文字ラベル）
  - 上部タイプカラーアクセントライン（8px）
  - ブランドテキスト（ピクセルフォント）
- 文字ラベルは5×7ピクセルフォント（scale 3 = 15×21px）

### タイプ名変更（このセッションで実施）
日本語名 → 英語名に変更済み（4ファイル）

| 旧 | 新 |
|---|---|
| 暖色タイプ | SUNSET TYPE |
| 深海タイプ | OCEAN TYPE |
| 森林タイプ | FOREST TYPE |
| モノクロタイプ | VOID TYPE |
| パステルタイプ | BLOOM TYPE |
| ネオンタイプ | NEON TYPE |
| 夢想タイプ | DREAM TYPE |
| 大地タイプ | EARTH TYPE |

---

## 未解決の問題

### OGP画像に日本語フォントが表示できない
Cloudflare Pages Functions の制約により以下がすべて利用不可：

| API/手法 | 状態 | 理由 |
|---|---|---|
| OffscreenCanvas | ✗ | 環境に存在しない（compat date 2024-09-23でも無効） |
| FontFace API | ✗ | Workers未対応 |
| WASM（動的ロード） | ✗ | CSPで禁止 |
| WASM（import文） | ✗ | バンドルサイズ超過→ERR_INVALID_RESPONSE |
| satori + resvg-wasm | ✗ | 同上（1MB制限超過） |
| Google Fonts CSS解析 | ✗ | URL形式不一致でパース失敗 |

→ 結果として現在は**ピクセルフォントの純粋JS実装**で運用中

### OGP画像のX（Twitter）キャッシュ
- result.html.js が正しくメタタグを書き換えていれば、X側のキャッシュ問題
- Twitter Card Validator で強制リフレッシュが必要

---

## 次にやるべきこと

### OGP画像の品質改善（優先度高）
現状はピクセルフォントで見た目が良くない。以下のいずれかを検討：

1. **Cloudflare Worker（Pages外）として別デプロイ**
   - wrangler で standalone Worker をデプロイ
   - WASM（resvg-wasm）が正常に使える
   - satori + TTF（Google Fonts, IE6 UA で取得）で日本語対応

2. **外部OGP生成サービスを使う**
   - Cloudinaryなど
   - og.js は SVG（satori）を生成して外部に渡すのみ

3. **現状維持**（ドットのみのビジュアルOGP）

### 診断タイプ名の変更反映確認
- push後、Cloudflare Pages がリビルドしたか確認
- result.html のタイプ名表示を目視確認

### 診断タイプ（getDiagType）の名称・説明文変更
ユーザーが変更を検討中（未実施）：
- ✦ 孤高の共感覚者
- ◈ 個性派の色覚者
- ◎ 共感覚の王道
- ◇ バランス感受者

---

## 変更したファイル一覧（このセッション）

| ファイル | 変更内容 |
|---|---|
| `functions/api/og.js` | 複数回書き換え。最終: 純粋JS PNGジェネレーター |
| `functions/result.html.js` | HTMLRewriterセレクタ修正、タイプ名英語化 |
| `functions/result.js` | タイプ名英語化 |
| `functions/_middleware.js` | 新規作成（現在は result.html.js と役割重複） |
| `result.html` | COLOR_TYPES の name を英語化 |
| `debug.html` | タイプ名英語化 |
| `package.json` | 新規作成。現在は空依存（試行錯誤の末） |
| `wrangler.toml` | 新規作成。compatibility_date = 2024-09-23 |

---

## 注意事項

- **Cloudflare Pages Functions の制約が非常に厳しい**。CanvasもWASMも使えない
- `functions/_middleware.js` と `functions/result.html.js` が役割重複している可能性あり。整理が必要
- `functions/result.js` の役途が不明。`result.html.js` と同じ内容を持つ
- OGP画像のキャッシュは `Cache-Control: public, max-age=86400`。変更後はXのカードキャッシュを手動リフレッシュ必要

---

## 今後の指示ルール

- コードの全文を確認してから編集する
- 変更は最小限・段階的に行う
- デプロイ後は必ず `/api/og?r=XXX&mode=10` を直接ブラウザで確認してからXでの表示を確認する
- エラーが `ERR_INVALID_RESPONSE` の場合はバンドルサイズ超過を疑う（npm依存を増やさない）
- エラーが `og error: ...` の場合はJS実行時エラーなので原因特定しやすい

**Why:** 過去に同じエラーを繰り返したため、制約の全体像を把握した上で手を動かすこと。

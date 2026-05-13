# SynestheShare — Supabase セットアップ手順

## 1. Supabaseプロジェクトを作成

1. https://supabase.com にアクセスしてアカウント作成（無料）
2. 「New Project」をクリック
3. プロジェクト名: `synestheshare`、パスワードを設定してCreate

---

## 2. データベース（テーブル）を作成

Supabaseの管理画面 → **SQL Editor** を開いて以下を貼り付けて実行:

```sql
-- 投票テーブル
CREATE TABLE votes (
  id           bigint generated always as identity primary key,
  letter       text not null,
  color_hex    text not null,
  color_group  text not null,
  created_at   timestamptz default now()
);

-- インデックス（集計を高速化）
CREATE INDEX idx_votes_letter ON votes(letter);

-- 匿名ユーザーが INSERT のみ可能にする（SELECT も許可）
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can insert"
  ON votes FOR INSERT
  WITH CHECK (true);

CREATE POLICY "anyone can read"
  ON votes FOR SELECT
  USING (true);
```

---

## 3. APIキーを取得

Supabase管理画面 → **Project Settings** → **API** を開く

- **Project URL** をコピー
- **anon public** キーをコピー

---

## 4. alphabet.html に貼り付ける

`alphabet.html` の先頭にある以下の部分を書き換える:

```javascript
const SUPABASE_URL  = 'https://xxxxxxxxxxxx.supabase.co';  // ← あなたのURL
const SUPABASE_ANON = 'eyJxxxxxx...';                       // ← あなたのanonキー
```

---

## 5. 同じ設定を number.html / consonant.html / subject.html にも反映

各ページを作成する際、同じ2行を書き換えてください。

---

## 無料枠の上限（参考）

| 項目 | 無料枠 |
|------|--------|
| データベース容量 | 500 MB |
| APIリクエスト | 50万回/月 |
| 同時接続 | 最大200 |

**月50万票**まで無料。バズって超えそうになったら $25/月のProプランへ。

---

## デプロイ（GitHub Pages）

```bash
# リポジトリに追加してプッシュするだけ
git add index.html alphabet.html
git commit -m "feat: リニューアル版 + 投票機能追加"
git push
```

GitHub Pages は自動でデプロイされます。

---

## 次のステップ

- [ ] `number.html` / `consonant.html` / `subject.html` も同様にリニューアル
- [ ] OGP画像を動的生成（Vercel Edge Functionsで対応可、月0円）
- [ ] 診断タイプ化（暖色派・寒色派など）を追加
- [ ] 「友達と比べる」機能（URLに相手のデータを埋め込む）

# 化学式マスター

日本語名から化学式を4択で選ぶクイズゲームです。  
1人モード（タイムアタック）と2人対戦（HP削り合い）に対応しています。

---

## セットアップ手順

### 1. Firebaseプロジェクトを作成

1. [Firebase Console](https://console.firebase.google.com/) にアクセス
2. 「プロジェクトを追加」→ 任意の名前でプロジェクト作成
3. 左メニュー「構築」→「Realtime Database」→「データベースを作成」
   - ロケーション: `asia-southeast1`（シンガポール）推奨
   - セキュリティルール: 「テストモードで開始」を選択（後でルールを適用）
4. 左メニュー「プロジェクトの概要」横の歯車 → 「プロジェクトの設定」
5. 「マイアプリ」→「</>」（ウェブ）でアプリを登録
6. 表示された `firebaseConfig` をコピー

### 2. firebase-init.js を編集

`firebase-init.js` を開き、`firebaseConfig` の中身を手順1でコピーしたものに書き換えてください。

```js
const firebaseConfig = {
  apiKey:            "実際のAPIキー",
  authDomain:        "your-project.firebaseapp.com",
  databaseURL:       "https://your-project-default-rtdb.firebaseio.com",
  projectId:         "your-project",
  storageBucket:     "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId:             "1:123456789:web:abcdef"
};
```

### 3. Databaseセキュリティルールを適用

Firebase Console → Realtime Database → 「ルール」タブで以下を貼り付けて公開：

```json
{
  "rules": {
    "rooms": {
      "$roomId": {
        ".read": true,
        ".write": true
      }
    }
  }
}
```

### 4. Firebase CLIでデプロイ

```bash
# Firebase CLIをインストール（未インストールの場合）
npm install -g firebase-tools

# ログイン
firebase login

# プロジェクトを初期化（既存プロジェクトを選択）
firebase use --add

# デプロイ
firebase deploy
```

デプロイ完了後、表示されたURLにアクセスすれば完成です。

---

### GitHub Actions で自動デプロイ（オプション）

`.github/workflows/deploy.yml` を作成：

```yaml
name: Deploy to Firebase
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: ${{ secrets.GITHUB_TOKEN }}
          firebaseServiceAccount: ${{ secrets.FIREBASE_SERVICE_ACCOUNT }}
          projectId: your-project-id
```

`FIREBASE_SERVICE_ACCOUNT` は Firebase Console → プロジェクト設定 → サービスアカウント から生成したJSONをGitHub Secretsに登録してください。

---

## ファイル構成

```
chem-quiz/
├── index.html          # メインHTML
├── style.css           # スタイル
├── firebase-init.js    # Firebase設定（要編集）
├── questions.js        # 問題データ
├── game.js             # ゲームロジック
├── firebase.json       # Firebase Hosting設定
├── database.rules.json # Realtime Databaseルール
└── README.md
```

## 2人対戦の遊び方

1. 片方が「2人対戦」→「ルームを作る」→ 6桁のルームIDが表示される
2. もう片方が「ルームに参加」→ IDを入力して参加
3. 両者揃ったら自動でゲーム開始
4. 連続正答で相手にダメージ、不正解で自分にダメージ
5. 相手HPを0にすると勝利！

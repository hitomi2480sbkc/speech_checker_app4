# 音声文字起こし 検証Webアプリ (GitHub Pages対応)

`speech_gaze_audios` フォルダ内の音声を聴きながら、`speech_gaze_analysis_numbered.csv` の文字起こし（`speech_text`）が合っているか（◯）、間違っているか（×）、備考記述をスマートフォンやPCのブラウザから高速に検証・回答するためのWebアプリケーションです。

---

## 📱 主な機能・特徴

1. **GitHub Pages (github.io) 完全対応**:
   - サーバー不要の静的Webアプリ（HTML / CSS / JavaScript）。
   - 音声ファイル（MP3）も同封してリポジトリに配置すれば、スマホから直接再生可能。
2. **スマートフォンの localStorage 自動保存**:
   - 1タップごとに即座に端末内に保存。ブラウザを閉じたりリロードしても続きから再開可能。
3. **爆速チェックUI**:
   - **カードビュー（1問集中モード）**:
     - 親指で届く大きな「◯」「×」ボタン。
     - 「◯判定時に自動で次の未回答へ進む」クイックモード搭載。
     - 定型タグ（「聞き取り不能」「誤字あり」「ノイズ」等）のワンタップ入力。
   - **リストビュー（一覧モード）**:
     - 「すべて」「未回答」「◯のみ」「×のみ」「備考あり」フィルターと検索バー。
4. **オーディオプレイヤー内蔵**:
   - 100件ごとの結合MP3（`speech_gaze_001_100.mp3` など）をアプリ内で再生・一時停止・シーク・速度調整（0.8x〜2.0x）。
   - 外部プレイヤーで聴く場合やローカルMP3ファイルを読み込ませるモードも搭載。
5. **多彩なエクスポート機能**:
   - **CSVダウンロード (UTF-8 BOM付き)**: Excelで開いても絶対に文字化けしないCSV。
   - **JSONダウンロード**: バックアップや完全なデータ復元用。
   - **スマホ共有 (Share) & クリップボードコピー**: AirDrop、LINE、メール、メモ帳へワンタップ転送。
6. **回答の復元 (インポート)**:
   - 以前エクスポートしたJSONやCSVを読み込んで作業を引き継ぎ可能。

---

## 🚀 GitHub Pages (github.io) へのホスティング手順

### 手順 1: GitHub で新しいリポジトリを作成
1. [GitHub](https://github.com/) にログインし、右上の「+」→「New repository」をクリック。
2. リポジトリ名を入力（例: `speech-checker`）。
3. 「Public」を選択して作成します。

### 手順 2: ファイルをリポジトリへアップロード
このフォルダ（`speech_checker_app`）の中身をリポジトリにアップロードします。

**【Gitコマンドを使う場合】**
```bash
cd speech_checker_app
git init
git add .
git commit -m "Initial commit: Speech checker web app"
git branch -M main
git remote add origin https://github.com/<あなたのユーザー名>/<リポジトリ名>.git
git push -u origin main
```

**【GitHubのWeb画面からドラッグ＆ドロップする場合】**
- リポジトリ画面で「uploading an existing file」をクリックし、`speech_checker_app` 内の全ファイル（`index.html`, `style.css`, `app.js`, `data.js`, `speech_gaze_audios` フォルダ）をドラッグ＆ドロップしてコミットします。

### 手順 3: GitHub Pages を有効化
1. リポジトリの **「Settings」** タブを開きます。
2. 左メニューの **「Pages」** をクリックします。
3. **Build and deployment** の Source で **「Deploy from a branch」** を選択。
4. Branch で **`main`**（または `master`）、フォルダは **`/ (root)`** を選択して **「Save」** をクリック。
5. 1〜2分待つと、画面上部に公開URLが表示されます！
   - 例: `https://<あなたのユーザー名>.github.io/<リポジトリ名>/`

スマートフォンでこのURLを開くだけで、いつでもどこでも検証作業ができます。

---

## 💻 PC上での回答マージ手順 (エクスポート後の処理)

スマホで作業が完了（または一時保存）したら、以下の手順でPC上の元データとマージします。

1. スマホのアプリ右上にある **「保存/出力」** ボタンを押し、**「CSVをダウンロード」** または **「JSONをダウンロード」** をタップ。
2. ダウンロードしたファイルをPCに送ります（AirDrop、メール、Googleドライブ、USB等）。
3. PCの分析フォルダにある **`【回答マージ実行】.bat`** をダブルクリック！
   - 自動的に「ダウンロード」フォルダまたは同じフォルダ内の最新回答ファイルを検出し、マージを実行します。
   - または、エクスポートファイルを `【回答マージ実行】.bat` のアイコンの上に直接ドラッグ＆ドロップしてもOKです。
4. 以下の2つの成果物ファイルが自動生成されます：
   - **`speech_gaze_analysis_verified.csv`**: UTF-8 BOM付きCSV（Excelでも文字化けしません）
   - **`speech_gaze_analysis_verified.xlsx`**: 判定（◯は薄緑、×は薄赤）のカラーリング付き、集計サマリーシート付きのExcelファイル

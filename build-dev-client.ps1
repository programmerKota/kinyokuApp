# EAS Development Client ビルドスクリプト
# OAuth認証テスト用の開発ビルドを作成

Write-Host "EAS Development Client のビルドを開始します..." -ForegroundColor Green
Write-Host ""
Write-Host "このビルドにより、以下が可能になります：" -ForegroundColor Cyan
Write-Host "  - OAuth認証（Google等）の動作確認" -ForegroundColor White
Write-Host "  - カスタムスキーム (abstinence://) の使用" -ForegroundColor White
Write-Host "  - ホットリロード等の開発機能" -ForegroundColor White
Write-Host ""
Write-Host "ビルドには約10-20分かかります。" -ForegroundColor Yellow
Write-Host ""

# ビルド開始
npx eas-cli build --profile development --platform ios

Write-Host ""
Write-Host "ビルドが完了したら、以下の手順でインストールしてください：" -ForegroundColor Green
Write-Host "1. QRコードをスキャン、またはリンクをタップ" -ForegroundColor White
Write-Host "2. TestFlightまたは直接インストール" -ForegroundColor White
Write-Host "3. アプリを起動して開発サーバーに接続: npx expo start --dev-client" -ForegroundColor White


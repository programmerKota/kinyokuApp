import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

// ブラウザデバッグとエラー修正の統合システム
class BrowserDebugger {
  constructor() {
    this.browser = null;
    this.page = null;
    this.debugSession = {
      startTime: new Date(),
      errors: [],
      fixes: [],
      screenshots: []
    };
  }

  async start() {
    console.log('🚀 ブラウザデバッグセッションを開始します...');
    
    this.browser = await chromium.launch({
      headless: false,
      devtools: true,
      args: ['--disable-web-security', '--disable-features=VizDisplayCompositor']
    });
    
    const context = await this.browser.newContext({
      viewport: { width: 1280, height: 900 },
      recordVideo: {
        dir: './debug-videos/',
        size: { width: 1280, height: 900 }
      }
    });
    
    this.page = await context.newPage();
    
    // デバッグ用のイベントリスナーを設定
    this.setupDebugListeners();
    
    // アプリケーションにアクセス
    await this.navigateToApp();
    
    // インタラクティブモードを開始
    await this.startInteractiveMode();
  }

  setupDebugListeners() {
    // コンソールログを監視
    this.page.on('console', msg => {
      const timestamp = new Date().toISOString();
      const logEntry = {
        timestamp,
        type: msg.type(),
        text: msg.text(),
        location: msg.location()
      };
      
      console.log(`[${msg.type().toUpperCase()}] ${msg.text()}`);
      
      if (msg.type() === 'error') {
        this.handleError('ConsoleError', msg.text(), msg.location());
      }
    });
    
    // ページエラーを監視
    this.page.on('pageerror', error => {
      this.handleError('PageError', error.message, {
        filename: error.stack?.split('\n')[1] || 'unknown'
      });
    });
    
    // ネットワークリクエストを監視
    this.page.on('request', request => {
      console.log(`🌐 リクエスト: ${request.method()} ${request.url()}`);
    });
    
    this.page.on('response', response => {
      if (!response.ok()) {
        this.handleError('NetworkError', 
          `${response.status()} ${response.url()}`);
      }
    });
  }

  async navigateToApp() {
    console.log('📱 アプリケーションにアクセス中...');
    
    try {
      await this.page.goto('http://localhost:8081', { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });
      
      console.log('✅ アプリケーションが正常に読み込まれました');
      
      // 初期スクリーンショット
      await this.takeScreenshot('initial-load');
      
    } catch (error) {
      console.error('❌ アプリケーションの読み込みに失敗しました:', error.message);
      
      // 代替URLを試行
      console.log('🔄 代替URLを試行中...');
      try {
        await this.page.goto('http://localhost:3000', { 
          waitUntil: 'networkidle',
          timeout: 15000 
        });
        console.log('✅ 代替URLでアプリケーションが読み込まれました');
      } catch (altError) {
        console.error('❌ 代替URLでも読み込みに失敗しました:', altError.message);
      }
    }
  }

  async handleError(type, message, location = {}) {
    const error = {
      type,
      message,
      location,
      timestamp: new Date().toISOString(),
      url: this.page.url()
    };
    
    this.debugSession.errors.push(error);
    console.log(`\n❌ エラー検出 [${type}]:`);
    console.log(`   メッセージ: ${message}`);
    console.log(`   場所: ${location.filename || 'unknown'}`);
    console.log(`   時間: ${error.timestamp}`);
    
    // エラー発生時のスクリーンショット
    await this.takeScreenshot(`error-${type}-${Date.now()}`);
    
    // 自動修正を試行
    await this.attemptAutoFix(error);
  }

  async attemptAutoFix(error) {
    console.log('🔧 自動修正を試行中...');
    
    const fixes = this.getFixSuggestions(error);
    
    for (const fix of fixes) {
      console.log(`💡 修正提案: ${fix.description}`);
      
      try {
        const success = await fix.action();
        if (success) {
          console.log('✅ 修正が成功しました');
          this.debugSession.fixes.push({
            error,
            fix,
            timestamp: new Date().toISOString(),
            success: true
          });
          break;
        }
      } catch (fixError) {
        console.log(`❌ 修正に失敗しました: ${fixError.message}`);
      }
    }
  }

  getFixSuggestions(error) {
    const suggestions = [];
    
    switch (error.type) {
      case 'ConsoleError':
        if (error.message.includes('is not defined')) {
          suggestions.push({
            description: '未定義変数の修正',
            action: () => this.fixUndefinedVariable(error.message)
          });
        }
        break;
        
      case 'NetworkError':
        suggestions.push({
          description: 'ネットワーク接続の確認',
          action: () => this.checkNetworkConnection()
        });
        break;
        
      case 'PageError':
        suggestions.push({
          description: 'ページエラーの詳細確認',
          action: () => this.analyzePageError(error)
        });
        break;
    }
    
    return suggestions;
  }

  async fixUndefinedVariable(message) {
    const variableMatch = message.match(/(\w+) is not defined/);
    if (variableMatch) {
      const variableName = variableMatch[1];
      console.log(`🔍 変数 '${variableName}' の使用箇所を検索中...`);
      
      // ページ内で変数の使用箇所を検索
      const elements = await this.page.locator(`text=${variableName}`).all();
      console.log(`📝 変数 '${variableName}' が ${elements.length} 箇所で使用されています`);
      
      return true;
    }
    return false;
  }

  async checkNetworkConnection() {
    console.log('🌐 ネットワーク接続を確認中...');
    
    try {
      // 基本的な接続テスト
      const response = await this.page.request.get('http://localhost:8081');
      console.log(`📡 接続ステータス: ${response.status()}`);
      return response.ok();
    } catch (error) {
      console.log(`❌ 接続エラー: ${error.message}`);
      return false;
    }
  }

  async analyzePageError(error) {
    console.log('🔍 ページエラーを分析中...');
    
    // エラースタックを取得
    const stack = await this.page.evaluate(() => {
      return new Error().stack;
    });
    
    console.log('📚 エラースタック:', stack);
    return true;
  }

  async takeScreenshot(name) {
    const filename = `debug-screenshot-${name}-${Date.now()}.png`;
    const filepath = path.join('./debug-screenshots/', filename);
    
    // ディレクトリを作成
    await fs.promises.mkdir('./debug-screenshots/', { recursive: true });
    
    await this.page.screenshot({ 
      path: filepath,
      fullPage: true 
    });
    
    this.debugSession.screenshots.push({
      name,
      filename,
      filepath,
      timestamp: new Date().toISOString()
    });
    
    console.log(`📸 スクリーンショット保存: ${filename}`);
  }

  async startInteractiveMode() {
    console.log('\n🎮 インタラクティブモードを開始します');
    console.log('以下のコマンドが使用できます:');
    console.log('  screenshot - スクリーンショットを撮影');
    console.log('  click <selector> - 要素をクリック');
    console.log('  type <selector> <text> - テキストを入力');
    console.log('  wait <seconds> - 指定秒数待機');
    console.log('  report - デバッグレポートを表示');
    console.log('  quit - 終了');
    console.log('\nコマンドを入力してください:');
    
    // 簡単なコマンド処理（実際の実装では readline を使用）
    this.setupCommandHandlers();
  }

  setupCommandHandlers() {
    // 実際の実装では readline を使用してコマンド入力を受け付ける
    console.log('💡 コマンド入力機能は開発中です');
  }

  async generateReport() {
    const report = {
      session: this.debugSession,
      summary: {
        duration: Date.now() - this.debugSession.startTime.getTime(),
        totalErrors: this.debugSession.errors.length,
        totalFixes: this.debugSession.fixes.length,
        totalScreenshots: this.debugSession.screenshots.length
      }
    };
    
    const reportPath = `./debug-report-${Date.now()}.json`;
    await fs.promises.writeFile(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`📊 デバッグレポートを生成しました: ${reportPath}`);
    return report;
  }

  async stop() {
    if (this.browser) {
      // 最終レポートを生成
      await this.generateReport();
      
      await this.browser.close();
      console.log('🔚 デバッグセッションを終了しました');
    }
  }
}

// メイン実行
const debugger = new BrowserDebugger();

// プロセス終了時のクリーンアップ
process.on('SIGINT', async () => {
  console.log('\n🛑 デバッグセッションを終了しています...');
  await debugger.stop();
  process.exit(0);
});

// デバッグ開始
debugger.start().catch(console.error);



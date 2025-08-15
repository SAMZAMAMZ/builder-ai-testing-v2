import fetch from 'node-fetch';
/**
* Telegram notification system for Builder-AI monitoring
* Provides real-time alerts for system status and errors
*/
export interface NotificationConfig {
  botToken?: string;
  chatId?: string;
  enabled: boolean;
}

class TelegramNotifier {
  private config: NotificationConfig;

  constructor() {
    this.config = {
      botToken: process.env.TELEGRAM_BOT_TOKEN,
      chatId: process.env.TELEGRAM_ALLOWED_CHAT_ID,
      enabled: !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_ALLOWED_CHAT_ID)
    };
  }

  async send(message: string, reason?: string): Promise<boolean> {
    if (!this.config.enabled) {
      console.log('Telegram not configured, message would be:', message);
      return false;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(
        `https://api.telegram.org/bot${this.config.botToken}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: this.config.chatId,
            text: message,
            parse_mode: 'Markdown',
            disable_web_page_preview: true
          }),
          signal: controller.signal
        }
      );

      clearTimeout(timeoutId);

      if (response.ok) {
        console.log('✅ Telegram notification sent successfully');
        return true;
      } else {
        const errorText = await response.text();
        console.error('❌ Telegram notification failed:', response.status, errorText);
        return false;
      }
    } catch (error) {
      console.error('❌ Telegram notification error:', error instanceof Error ? error.message : String(error));
      return false;
    }
  }

  // Test notification to verify setup
  async testConnection(): Promise<boolean> {
    return this.send('🔧 *Builder-AI Test*\nTelegram notification system operational');
  }
}

// Create singleton instance
const telegramNotifier = new TelegramNotifier();

// Main notification function
export async function sendTelegramNotification(message: string): Promise<boolean> {
  return telegramNotifier.send(message);
}

// Pre-defined notification templates
export const notifications = {
  // System lifecycle notifications
  systemStart: () => 
    sendTelegramNotification('🚀 *Builder-AI Started*\n\n' +
      '🎯 Contract testing system operational\n' +
      `📅 Time: ${new Date().toLocaleString()}\n` +
      '🚂 Platform: Railway\n' +
      '✅ Status: Ready for testing'),

  systemStop: () =>
    sendTelegramNotification('🛑 *Builder-AI Stopped*\n\n' +
      `📅 Time: ${new Date().toLocaleString()}\n` +
      '⚠️ Check logs for details'),

  // Contract testing notifications  
  contractStart: (contract: string) => 
    sendTelegramNotification(`🧪 *Testing Started*\n\n` +
      `📋 Contract: ${contract}\n` +
      `📅 Started: ${new Date().toLocaleString()}\n` +
      '🔄 Status: Running tests'),

  contractComplete: (contract: string, stats: { passed: number; failed: number; fixed: number; duration: number }) =>
    sendTelegramNotification(`✅ *${contract} Testing Complete*\n\n` +
      `📊 Results:\n` +
      `  • Passed: ${stats.passed}\n` +
      `  • Failed: ${stats.failed}\n` +
      `  • Auto-Fixed: ${stats.fixed}\n` +
      `⏱️ Duration: ${Math.round(stats.duration / 1000)}s\n` +
      `📅 Completed: ${new Date().toLocaleString()}`),

  // Error and alert notifications
  systemError: (error: string, context?: string) =>
    sendTelegramNotification(`🚨 *SYSTEM ERROR*\n\n` +
      `❌ Error: ${error}\n` +
      `📍 Context: ${context || 'Unknown'}\n` +
      `📅 Time: ${new Date().toLocaleString()}\n` +
      `🔧 Action: Check logs immediately!`),

  criticalFailure: (contract: string, error: string) =>
    sendTelegramNotification(`💥 *CRITICAL FAILURE*\n\n` +
      `📋 Contract: ${contract}\n` +
      `❌ Error: ${error}\n` +
      `📅 Time: ${new Date().toLocaleString()}\n` +
      `🚨 Manual intervention required!`),

  // File and deployment notifications
  testUpload: (contract: string, filename: string) =>
    sendTelegramNotification(`📤 *New Test Uploaded*\n\n` +
      `📋 Contract: ${contract}\n` +
      `📄 File: ${filename}\n` +
      `📅 Time: ${new Date().toLocaleString()}\n` +
      '🔄 Auto-execution starting'),

  deploymentSuccess: () =>
    sendTelegramNotification('🎉 *Deployment Successful*\n\n' +
      '✅ Builder-AI deployed to Railway\n' +
      `📅 Time: ${new Date().toLocaleString()}\n` +
      '🔗 All endpoints operational'),

  // Progress and overnight notifications
  overnightProgress: (stats: { completed: number; total: number; eta: string; currentContract?: string }) =>
    sendTelegramNotification(`🌙 *Overnight Progress Report*\n\n` +
      `📊 Progress: ${stats.completed}/${stats.total} contracts\n` +
      `📈 Completion: ${Math.round((stats.completed / stats.total) * 100)}%\n` +
      `⏰ ETA: ${stats.eta}\n` +
      `🔄 Current: ${stats.currentContract || 'None'}\n` +
      `📅 Update: ${new Date().toLocaleString()}`),

  hourlyHeartbeat: (uptime: number, contracts: number) =>
    sendTelegramNotification(`💓 *Hourly Heartbeat*\n\n` +
      `⏱️ Uptime: ${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m\n` +
      `📋 Contracts Processed: ${contracts}\n` +
      `📅 Time: ${new Date().toLocaleString()}\n` +
      '✅ System operational')
};

// Export the notifier instance for advanced usage
export { telegramNotifier };

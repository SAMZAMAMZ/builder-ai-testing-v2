import Anthropic from '@anthropic-ai/sdk';

declare global {
  var sendTelegramNotification: (message: string) => Promise<boolean>;
}

export class ClaudeAPIManager {
  private apiKeys: string[];
  private currentKeyIndex: number = 0;
  private requestCounts: Map<string, number> = new Map();
  private lastResetTime: number = Date.now();
  private maxRequestsPerMinute: number;

  constructor() {
    this.apiKeys = [
      process.env.CLAUDE_API_KEY_1,
      process.env.CLAUDE_API_KEY_2,
      process.env.CLAUDE_API_KEY_3
    ].filter((key): key is string => !!key); // Remove undefined keys with type guard

    this.maxRequestsPerMinute = parseInt(process.env.MAX_REQUESTS_PER_KEY_PER_MINUTE || '50');

    if (this.apiKeys.length === 0) {
      console.warn('No Claude API keys configured - running in limited mode');
      this.apiKeys = ['dummy-key'];
    }
    console.log(`✅ Claude API Manager initialized with ${this.apiKeys.length} keys`);
  }

  private resetCountsIfNeeded(): void {
    const now = Date.now();
    if (now - this.lastResetTime > 60000) { // Reset every minute
      this.requestCounts.clear();
      this.lastResetTime = now;
    }
  }

  private getCurrentKey(): string {
    return this.apiKeys[this.currentKeyIndex];
  }

  private canMakeRequest(apiKey: string): boolean {
    this.resetCountsIfNeeded();
    const count = this.requestCounts.get(apiKey) || 0;
    return count < this.maxRequestsPerMinute;
  }

  private incrementRequestCount(apiKey: string): void {
    const count = this.requestCounts.get(apiKey) || 0;
    this.requestCounts.set(apiKey, count + 1);
  }

  private rotateToNextKey(): void {
    this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;
    console.log(`🔄 Rotated to API key ${this.currentKeyIndex + 1}/${this.apiKeys.length}`);
  }

  private findAvailableKey(): string | null {
    // Check current key first
    let currentKey = this.getCurrentKey();
    if (this.canMakeRequest(currentKey)) {
      return currentKey;
    }

    // Try other keys
    for (let i = 0; i < this.apiKeys.length; i++) {
      this.rotateToNextKey();
      currentKey = this.getCurrentKey();
      if (this.canMakeRequest(currentKey)) {
        return currentKey;
      }
    }
    return null; // All keys exhausted
  }

  async makeClaudeRequest(messages: any[], maxRetries: number = 3): Promise<any> {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const apiKey = this.findAvailableKey();
      if (!apiKey) {
        const waitTime = parseInt(process.env.RATE_LIMIT_BACKOFF_SECONDS || '60');
        console.log(`⚠️ All API keys rate limited, waiting ${waitTime}s...`);
        // Send Telegram notification if available
        if (global.sendTelegramNotification) {
          await global.sendTelegramNotification(
            `⚠️ *Builder-AI Rate Limit*\nAll Claude API keys exhausted\nWaiting ${waitTime}s before retry\nAttempt: ${attempt + 1}/${maxRetries}`
          );
        }
        await new Promise(resolve => setTimeout(resolve, waitTime * 1000));
        continue;
      }

      try {
        const anthropic = new Anthropic({ apiKey });
        this.incrementRequestCount(apiKey);
        const response = await anthropic.messages.create({
          model: 'claude-3-sonnet-20240229',
          max_tokens: 4000,
          messages
        });
        console.log(`✅ Claude request successful with key ${this.currentKeyIndex + 1}`);
        return response;
      } catch (error: any) {
        if (error.message?.includes('rate_limit') || error.status === 429) {
          console.log(`⚠️ Rate limit hit on key ${this.currentKeyIndex + 1}, trying next...`);
          this.rotateToNextKey();
          continue;
        }
        throw error; // Non-rate-limit error
      }
    }
    throw new Error('All Claude API retry attempts exhausted');
  }

  getStatus() {
    this.resetCountsIfNeeded();
    return {
      totalKeys: this.apiKeys.length,
      currentKeyIndex: this.currentKeyIndex + 1,
      requestCounts: Object.fromEntries(
        this.apiKeys.map((key, i) => [
          `key${i + 1}`, 
          this.requestCounts.get(key) || 0
        ])
      ),
      maxRequestsPerMinute: this.maxRequestsPerMinute
    };
  }
}

// Export singleton instance
export const claudeAPIManager = new ClaudeAPIManager();
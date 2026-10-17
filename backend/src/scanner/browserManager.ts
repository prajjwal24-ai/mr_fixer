import { chromium, type Browser, type BrowserContext } from 'playwright';
import { AppError } from '../middleware/errorHandler.js';

export interface ContextLease {
  context: BrowserContext;
  release: () => Promise<void>;
}

export class BrowserManager {
  private static instance: BrowserManager | null = null;
  private browser: Browser | null = null;
  private activeContexts = 0;
  private readonly maxConcurrentScans: number;
  private isShuttingDown = false;

  private constructor(maxConcurrentScans = 3) {
    this.maxConcurrentScans = maxConcurrentScans;
    this.registerProcessHandlers();
  }

  public static getInstance(maxConcurrentScans = 3): BrowserManager {
    if (!BrowserManager.instance) {
      BrowserManager.instance = new BrowserManager(maxConcurrentScans);
    }
    return BrowserManager.instance;
  }

  private registerProcessHandlers(): void {
    const handleShutdown = async () => {
      if (this.isShuttingDown) return;
      this.isShuttingDown = true;
      console.log('[BrowserManager] Graceful shutdown initiated. Closing browser...');
      await this.closeBrowser();
    };

    process.once('SIGTERM', handleShutdown);
    process.once('SIGINT', handleShutdown);
  }

  /**
   * Lazily initializes and returns the Chromium browser instance.
   */
  public async getBrowser(): Promise<Browser> {
    if (this.browser && this.browser.isConnected()) {
      return this.browser;
    }

    const args = [
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ];

    // Keep sandbox enabled by default. Only allow disabling if explicitly configured in environment.
    if (process.env.CHROME_NO_SANDBOX === 'true') {
      args.push('--no-sandbox', '--disable-setuid-sandbox');
    }

    this.browser = await chromium.launch({
      headless: true,
      args,
    });

    // Auto-recovery on browser crash or abnormal disconnection
    this.browser.on('disconnected', () => {
      console.warn('[BrowserManager] Chromium process disconnected. Clearing browser reference.');
      this.browser = null;
    });

    return this.browser;
  }

  /**
   * Acquires an ephemeral BrowserContext, enforcing the concurrency limit.
   */
  public async acquireContext(): Promise<ContextLease> {
    if (this.isShuttingDown) {
      throw new AppError(503, 'SERVICE_UNAVAILABLE', 'Server is shutting down.');
    }

    if (this.activeContexts >= this.maxConcurrentScans) {
      throw new AppError(
        429,
        'CONCURRENCY_LIMIT_REACHED',
        `Scanner busy. Maximum concurrent scans (${this.maxConcurrentScans}) reached. Please retry in a few moments.`
      );
    }

    this.activeContexts++;
    const browser = await this.getBrowser();

    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      ignoreHTTPSErrors: false,
      javaScriptEnabled: true,
    });

    let released = false;
    const release = async () => {
      if (released) return;
      released = true;
      try {
        await context.close();
      } catch {
        // Ignore errors if context already destroyed
      } finally {
        this.activeContexts = Math.max(0, this.activeContexts - 1);
      }
    };

    return { context, release };
  }

  public getActiveContextCount(): number {
    return this.activeContexts;
  }

  public async closeBrowser(): Promise<void> {
    if (this.browser) {
      try {
        await this.browser.close();
      } catch (err) {
        console.error('[BrowserManager] Error closing browser:', err);
      } finally {
        this.browser = null;
        this.activeContexts = 0;
      }
    }
  }

  /**
   * Resets singleton for test cleanup
   */
  public static async resetInstance(): Promise<void> {
    if (BrowserManager.instance) {
      await BrowserManager.instance.closeBrowser();
      BrowserManager.instance = null;
    }
  }
}

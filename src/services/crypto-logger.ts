/**
 * Crypto Activity Logger & Execution Tracer
 * Logs step-by-step mathematical execution of ElGamal algorithms, KeyGen, PKI issuance, Signing, and Verification
 * Designed for Academic & University Cryptography Capstone Projects.
 */

import { CryptoLogEntry, CryptoLogStep } from '../types';

const STORAGE_KEY = 'signwcert_crypto_logs';
const MAX_LOGS = 100;

class CryptoLoggerService {
  private logs: CryptoLogEntry[] = [];
  private listeners: ((logs: CryptoLogEntry[]) => void)[] = [];
  private isMuted = false;

  constructor() {
    this.loadLogs();
  }

  private loadLogs() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.logs = JSON.parse(stored);
      }
    } catch {
      this.logs = [];
    }
  }

  private saveLogs() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.logs.slice(0, MAX_LOGS)));
    } catch (e) {
      console.error('Failed to save crypto logs', e);
    }
    this.notifyListeners();
  }

  public subscribe(listener: (logs: CryptoLogEntry[]) => void) {
    this.listeners.push(listener);
    listener(this.getLogs());
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notifyListeners() {
    const current = this.getLogs();
    this.listeners.forEach((l) => l(current));
  }

  public getLogs(): CryptoLogEntry[] {
    return [...this.logs];
  }

  public mute() {
    this.isMuted = true;
  }

  public unmute() {
    this.isMuted = false;
  }

  public async runWithoutLogging<T>(fn: () => Promise<T> | T): Promise<T> {
    const prev = this.isMuted;
    this.isMuted = true;
    try {
      return await fn();
    } finally {
      this.isMuted = prev;
    }
  }

  public addLog(entry: Omit<CryptoLogEntry, 'id' | 'timestamp'>): CryptoLogEntry | null {
    if (this.isMuted) {
      return null;
    }

    const newEntry: CryptoLogEntry = {
      ...entry,
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
    };
    this.logs.unshift(newEntry);
    if (this.logs.length > MAX_LOGS) {
      this.logs = this.logs.slice(0, MAX_LOGS);
    }
    this.saveLogs();
    return newEntry;
  }

  public clearLogs() {
    this.logs = [];
    this.saveLogs();
  }
}

export const cryptoLogger = new CryptoLoggerService();

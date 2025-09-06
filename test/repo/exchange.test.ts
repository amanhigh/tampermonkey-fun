import { ExchangeRepo, IExchangeRepo } from '../../src/repo/exchange';
import { IRepoCron } from '../../src/repo/cron';

// Mock GM API
const mockGM = {
  getValue: jest.fn(),
  setValue: jest.fn(),
};

// Global GM mock
(global as any).GM = mockGM;

// Mock IRepoCron
const mockRepoCron: jest.Mocked<IRepoCron> = {
  registerRepository: jest.fn(),
  saveAllRepositories: jest.fn(),
};

describe('ExchangeRepo', () => {
  let exchangeRepo: IExchangeRepo;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockGM.getValue.mockResolvedValue({});
    mockGM.setValue.mockResolvedValue(undefined);
    exchangeRepo = new ExchangeRepo(mockRepoCron);
  });

  describe('constructor and initialization', () => {
    it('should register with repoCron', () => {
      expect(mockRepoCron.registerRepository).toHaveBeenCalledWith(exchangeRepo);
    });

    it('should initialize with empty maps', async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(exchangeRepo.getCount()).toBe(0);
      expect(exchangeRepo.getAllKeys()).toEqual([]);
    });
  });

  describe('exchange-qualified ticker formatting', () => {
    beforeEach(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
      exchangeRepo.clear();
    });

    it('should return original ticker when no exchange mapping exists', () => {
      expect(exchangeRepo.getExchangeTicker('HDFC')).toBe('HDFC');
      expect(exchangeRepo.getExchangeTicker('AAPL')).toBe('AAPL');
    });

    it('should return exchange-qualified ticker when mapping exists', () => {
      exchangeRepo.set('HDFC', 'NSE:HDFC');
      expect(exchangeRepo.getExchangeTicker('HDFC')).toBe('NSE:HDFC');
    });

    it('should handle multiple exchange mappings', () => {
      exchangeRepo.set('HDFC', 'NSE:HDFC');
      exchangeRepo.set('AAPL', 'NASDAQ:AAPL');
      exchangeRepo.set('TCS', 'BSE:TCS');

      expect(exchangeRepo.getExchangeTicker('HDFC')).toBe('NSE:HDFC');
      expect(exchangeRepo.getExchangeTicker('AAPL')).toBe('NASDAQ:AAPL');
      expect(exchangeRepo.getExchangeTicker('TCS')).toBe('BSE:TCS');
    });

    it('should pin exchange with correct format', () => {
      exchangeRepo.pinExchange('HDFC', 'NSE');
      expect(exchangeRepo.get('HDFC')).toBe('NSE:HDFC');
      expect(exchangeRepo.getExchangeTicker('HDFC')).toBe('NSE:HDFC');
    });

    it('should handle different exchanges for same ticker', () => {
      exchangeRepo.pinExchange('HDFC', 'NSE');
      expect(exchangeRepo.getExchangeTicker('HDFC')).toBe('NSE:HDFC');

      exchangeRepo.pinExchange('HDFC', 'BSE');
      expect(exchangeRepo.getExchangeTicker('HDFC')).toBe('BSE:HDFC');
    });
  });

  describe('edge cases', () => {
    beforeEach(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
      exchangeRepo.clear();
    });

    it('should handle empty string ticker', () => {
      expect(exchangeRepo.getExchangeTicker('')).toBe('');
      exchangeRepo.pinExchange('', 'NSE');
      expect(exchangeRepo.getExchangeTicker('')).toBe('NSE:');
    });

    it('should handle special characters in ticker', () => {
      const specialTicker = 'TICKER.WITH.DOTS';
      exchangeRepo.pinExchange(specialTicker, 'NSE');
      expect(exchangeRepo.getExchangeTicker(specialTicker)).toBe('NSE:TICKER.WITH.DOTS');
    });

    it('should handle exchange with special characters', () => {
      exchangeRepo.pinExchange('HDFC', 'NSE/BSE');
      expect(exchangeRepo.getExchangeTicker('HDFC')).toBe('NSE/BSE:HDFC');
    });

    it('should handle case sensitivity in tickers', () => {
      exchangeRepo.pinExchange('HDFC', 'NSE');
      expect(exchangeRepo.getExchangeTicker('hdfC')).toBe('hdfC'); // Case sensitive
      expect(exchangeRepo.getExchangeTicker('HDFC')).toBe('NSE:HDFC');
    });
  });
});

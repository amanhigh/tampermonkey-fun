import { AuditRepo, IAuditRepo } from '../../src/repo/audit';
import { IRepoCron } from '../../src/repo/cron';
import { AlertAudit, AlertState } from '../../src/models/alert';

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

describe('AuditRepo', () => {
  let auditRepo: IAuditRepo;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockGM.getValue.mockResolvedValue({});
    mockGM.setValue.mockResolvedValue(undefined);
    auditRepo = new AuditRepo(mockRepoCron);
  });

  describe('constructor and initialization', () => {
    it('should register with repoCron', () => {
      expect(mockRepoCron.registerRepository).toHaveBeenCalledWith(auditRepo);
    });

    it('should initialize with empty maps', async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(auditRepo.getCount()).toBe(0);
      expect(auditRepo.getAllKeys()).toEqual([]);
    });
  });

  describe('AlertAudit deserialization', () => {
    it('should deserialize audit data correctly', async () => {
      const mockData = {
        HDFC: { ticker: 'HDFC', state: AlertState.VALID },
        AAPL: { ticker: 'AAPL', state: AlertState.SINGLE_ALERT },
        TCS: { ticker: 'TCS', state: AlertState.NO_PAIR },
      };
      mockGM.getValue.mockResolvedValue(mockData);

      const newRepo = new AuditRepo(mockRepoCron);
      const loadedData = await newRepo.load();

      expect(loadedData.size).toBe(3);
      const hdfcAudit = loadedData.get('HDFC');
      expect(hdfcAudit).toBeInstanceOf(AlertAudit);
      expect(hdfcAudit?.investingTicker).toBe('HDFC');
      expect(hdfcAudit?.state).toBe(AlertState.VALID);

      const aaplAudit = loadedData.get('AAPL');
      expect(aaplAudit?.investingTicker).toBe('AAPL');
      expect(aaplAudit?.state).toBe(AlertState.SINGLE_ALERT);
    });

    it('should handle empty data during deserialization', async () => {
      mockGM.getValue.mockResolvedValue({});

      const newRepo = new AuditRepo(mockRepoCron);
      const loadedData = await newRepo.load();

      expect(loadedData.size).toBe(0);
    });
  });

  describe('state filtering', () => {
    beforeEach(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
      auditRepo.clear();
    });

    it('should filter audit results by state', () => {
      const audit1 = new AlertAudit('HDFC', AlertState.VALID);
      const audit2 = new AlertAudit('AAPL', AlertState.SINGLE_ALERT);
      const audit3 = new AlertAudit('TCS', AlertState.VALID);
      const audit4 = new AlertAudit('GOOGL', AlertState.NO_PAIR);

      auditRepo.set('HDFC', audit1);
      auditRepo.set('AAPL', audit2);
      auditRepo.set('TCS', audit3);
      auditRepo.set('GOOGL', audit4);

      const validResults = auditRepo.getFilteredAuditResults(AlertState.VALID);
      expect(validResults).toHaveLength(2);
      expect(validResults).toContain(audit1);
      expect(validResults).toContain(audit3);

      const singleAlertResults = auditRepo.getFilteredAuditResults(AlertState.SINGLE_ALERT);
      expect(singleAlertResults).toHaveLength(1);
      expect(singleAlertResults).toContain(audit2);

      const noPairResults = auditRepo.getFilteredAuditResults(AlertState.NO_PAIR);
      expect(noPairResults).toHaveLength(1);
      expect(noPairResults).toContain(audit4);

      const noAlertsResults = auditRepo.getFilteredAuditResults(AlertState.NO_ALERTS);
      expect(noAlertsResults).toHaveLength(0);
    });

    it('should return empty array when no results match state', () => {
      const audit1 = new AlertAudit('HDFC', AlertState.VALID);
      auditRepo.set('HDFC', audit1);

      const results = auditRepo.getFilteredAuditResults(AlertState.NO_ALERTS);
      expect(results).toEqual([]);
    });

    it('should handle empty repository', () => {
      const results = auditRepo.getFilteredAuditResults(AlertState.VALID);
      expect(results).toEqual([]);
    });
  });

  describe('audit operations', () => {
    beforeEach(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
      auditRepo.clear();
    });

    it('should store and retrieve audit results', () => {
      const audit = new AlertAudit('HDFC', AlertState.VALID);
      auditRepo.set('HDFC', audit);

      expect(auditRepo.get('HDFC')).toBe(audit);
      expect(auditRepo.has('HDFC')).toBe(true);
    });

    it('should handle multiple audit entries', () => {
      const audit1 = new AlertAudit('HDFC', AlertState.VALID);
      const audit2 = new AlertAudit('AAPL', AlertState.SINGLE_ALERT);
      const audit3 = new AlertAudit('TCS', AlertState.NO_PAIR);

      auditRepo.set('HDFC', audit1);
      auditRepo.set('AAPL', audit2);
      auditRepo.set('TCS', audit3);

      expect(auditRepo.getCount()).toBe(3);
      expect(auditRepo.getAllKeys()).toEqual(['HDFC', 'AAPL', 'TCS']);
    });
  });

  describe('edge cases', () => {
    beforeEach(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
      auditRepo.clear();
    });

    it('should handle empty string ticker', () => {
      const audit = new AlertAudit('', AlertState.VALID);
      auditRepo.set('', audit);
      expect(auditRepo.get('')).toBe(audit);
    });

    it('should handle special characters in ticker', () => {
      const specialTicker = 'TICKER.WITH.DOTS';
      const audit = new AlertAudit(specialTicker, AlertState.SINGLE_ALERT);
      auditRepo.set(specialTicker, audit);
      expect(auditRepo.get(specialTicker)).toBe(audit);
    });

    it('should handle all alert states', () => {
      Object.values(AlertState).forEach((state) => {
        const ticker = `TICKER_${state}`;
        const audit = new AlertAudit(ticker, state);
        auditRepo.set(ticker, audit);

        const filtered = auditRepo.getFilteredAuditResults(state);
        expect(filtered).toHaveLength(1);
        expect(filtered[0]).toBe(audit);
      });
    });
  });
});

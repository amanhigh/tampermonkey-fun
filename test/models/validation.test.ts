import { ValidationExclusions, ValidationResults } from '../../src/models/validation';
import { Alert, PairInfo } from '../../src/models/alert';

describe('ValidationExclusions', () => {
  let validationExclusions: ValidationExclusions;

  beforeEach(() => {
    validationExclusions = new ValidationExclusions();
  });

  describe('addExcludedPairId', () => {
    it('should add pair ID to exclusions', () => {
      const pairId = 'PAIR123';

      validationExclusions.addExcludedPairId(pairId);

      expect(validationExclusions.isExcludedPair(pairId)).toBe(true);
    });

    it('should handle multiple pair IDs', () => {
      const pairIds = ['PAIR1', 'PAIR2', 'PAIR3'];

      pairIds.forEach((id) => validationExclusions.addExcludedPairId(id));

      pairIds.forEach((id) => {
        expect(validationExclusions.isExcludedPair(id)).toBe(true);
      });
    });

    it('should handle duplicate pair IDs without error', () => {
      const pairId = 'DUPLICATE';

      validationExclusions.addExcludedPairId(pairId);
      validationExclusions.addExcludedPairId(pairId);

      expect(validationExclusions.isExcludedPair(pairId)).toBe(true);
    });
  });

  describe('addExcludedTicker', () => {
    it('should add ticker to exclusions', () => {
      const ticker = 'HDFC';

      validationExclusions.addExcludedTicker(ticker);

      expect(validationExclusions.isExcludedTicker(ticker)).toBe(true);
    });

    it('should handle multiple tickers', () => {
      const tickers = ['HDFC', 'RELIANCE', 'TCS'];

      tickers.forEach((ticker) => validationExclusions.addExcludedTicker(ticker));

      tickers.forEach((ticker) => {
        expect(validationExclusions.isExcludedTicker(ticker)).toBe(true);
      });
    });

    it('should handle duplicate tickers without error', () => {
      const ticker = 'DUPLICATE';

      validationExclusions.addExcludedTicker(ticker);
      validationExclusions.addExcludedTicker(ticker);

      expect(validationExclusions.isExcludedTicker(ticker)).toBe(true);
    });
  });

  describe('isExcludedPair', () => {
    it('should return false for non-excluded pair', () => {
      expect(validationExclusions.isExcludedPair('UNKNOWN_PAIR')).toBe(false);
    });

    it('should return true for excluded pair', () => {
      const pairId = 'EXCLUDED_PAIR';
      validationExclusions.addExcludedPairId(pairId);

      expect(validationExclusions.isExcludedPair(pairId)).toBe(true);
    });

    it('should be case sensitive', () => {
      validationExclusions.addExcludedPairId('CASE_SENSITIVE');

      expect(validationExclusions.isExcludedPair('CASE_SENSITIVE')).toBe(true);
      expect(validationExclusions.isExcludedPair('case_sensitive')).toBe(false);
    });
  });

  describe('isExcludedTicker', () => {
    it('should return false for non-excluded ticker', () => {
      expect(validationExclusions.isExcludedTicker('UNKNOWN_TICKER')).toBe(false);
    });

    it('should return true for excluded ticker', () => {
      const ticker = 'EXCLUDED_TICKER';
      validationExclusions.addExcludedTicker(ticker);

      expect(validationExclusions.isExcludedTicker(ticker)).toBe(true);
    });

    it('should be case sensitive', () => {
      validationExclusions.addExcludedTicker('CASE_SENSITIVE');

      expect(validationExclusions.isExcludedTicker('CASE_SENSITIVE')).toBe(true);
      expect(validationExclusions.isExcludedTicker('case_sensitive')).toBe(false);
    });
  });
});

describe('ValidationResults', () => {
  let validationResults: ValidationResults;
  let mockAlert: Alert;
  let mockPairInfo: PairInfo;

  beforeEach(() => {
    validationResults = new ValidationResults();
    mockAlert = new Alert('alert1', 'pair123', 100.5);
    mockPairInfo = new PairInfo('HDFC Bank', 'pair456', 'NSE', 'HDFC');
  });

  describe('getFormattedSummary', () => {
    it('should return formatted HTML summary with no issues', () => {
      const summary = validationResults.getFormattedSummary();

      expect(summary).toContain('🔍 Data Validation Report');
      expect(summary).toContain('⚠️ Orphan Alerts: <span style="color: #00FF00; font-weight: bold;">0</span>');
      expect(summary).toContain('🔗 Unmapped Pairs: <span style="color: #00FF00; font-weight: bold;">0</span>');
      expect(summary).toContain('✅ Status: All validations passed');
      expect(summary).toContain('font-family: monospace');
    });

    it('should return formatted HTML summary with issues', () => {
      validationResults.addOrphanAlert(mockAlert);
      validationResults.addUnmappedPair(mockPairInfo);

      const summary = validationResults.getFormattedSummary();

      expect(summary).toContain('⚠️ Orphan Alerts: <span style="color: #00FF00; font-weight: bold;">1</span>');
      expect(summary).toContain('🔗 Unmapped Pairs: <span style="color: #00FF00; font-weight: bold;">1</span>');
      expect(summary).toContain('❌ Status: Issues found (check console for details)');
    });

    it('should include proper CSS styling', () => {
      const summary = validationResults.getFormattedSummary();

      expect(summary).toContain('font-family: monospace; line-height: 1.5;');
      expect(summary).toContain('color: #FFA500; font-weight: bold; margin: 8px 0;');
      expect(summary).toContain('margin-left: 12px; color: #FFFFFF;');
      expect(summary).toContain('color: #00FF00; font-weight: bold;');
    });
  });

  describe('logDetailedResults', () => {
    let consoleSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, 'info').mockImplementation();
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it('should log validation details header', () => {
      validationResults.logDetailedResults();

      expect(consoleSpy).toHaveBeenCalledWith('=== Validation Details ===');
    });

    it('should log orphan alerts details', () => {
      validationResults.addOrphanAlert(mockAlert);

      validationResults.logDetailedResults();

      expect(consoleSpy).toHaveBeenCalledWith('Orphan Alerts:', 1);
      expect(consoleSpy).toHaveBeenCalledWith('- Alert alert1: PairID pair123 Price 100.5');
    });

    it('should log multiple orphan alerts', () => {
      const alert1 = new Alert('alert1', 'pair1', 100);
      const alert2 = new Alert('alert2', 'pair2', 200);

      validationResults.addOrphanAlert(alert1);
      validationResults.addOrphanAlert(alert2);

      validationResults.logDetailedResults();

      expect(consoleSpy).toHaveBeenCalledWith('Orphan Alerts:', 2);
      expect(consoleSpy).toHaveBeenCalledWith('- Alert alert1: PairID pair1 Price 100');
      expect(consoleSpy).toHaveBeenCalledWith('- Alert alert2: PairID pair2 Price 200');
    });

    it('should log unmapped pairs details', () => {
      validationResults.addUnmappedPair(mockPairInfo);

      validationResults.logDetailedResults();

      expect(consoleSpy).toHaveBeenCalledWith('Unmapped Pairs:', 1);
      expect(consoleSpy).toHaveBeenCalledWith('- Pair HDFC Bank: ID pair456 Exchange NSE');
    });

    it('should log multiple unmapped pairs', () => {
      const pair1 = new PairInfo('HDFC Bank', 'pair1', 'NSE', 'HDFC');
      const pair2 = new PairInfo('Reliance', 'pair2', 'NSE', 'RELIANCE');

      validationResults.addUnmappedPair(pair1);
      validationResults.addUnmappedPair(pair2);

      validationResults.logDetailedResults();

      expect(consoleSpy).toHaveBeenCalledWith('Unmapped Pairs:', 2);
      expect(consoleSpy).toHaveBeenCalledWith('- Pair HDFC Bank: ID pair1 Exchange NSE');
      expect(consoleSpy).toHaveBeenCalledWith('- Pair Reliance: ID pair2 Exchange NSE');
    });

    it('should log empty results', () => {
      validationResults.logDetailedResults();

      expect(consoleSpy).toHaveBeenCalledWith('Orphan Alerts:', 0);
      expect(consoleSpy).toHaveBeenCalledWith('Unmapped Pairs:', 0);
    });
  });

  describe('getOrphanAlerts', () => {
    it('should return array of orphan alerts', () => {
      validationResults.addOrphanAlert(mockAlert);

      const alerts = validationResults.getOrphanAlerts();

      expect(alerts).toEqual([mockAlert]);
      expect(alerts.length).toBe(1);
    });

    it('should return empty array when no alerts', () => {
      const alerts = validationResults.getOrphanAlerts();

      expect(alerts).toEqual([]);
      expect(alerts.length).toBe(0);
    });
  });

  describe('getUnmappedPairs', () => {
    it('should return array of unmapped pairs', () => {
      validationResults.addUnmappedPair(mockPairInfo);

      const pairs = validationResults.getUnmappedPairs();

      expect(pairs).toEqual([mockPairInfo]);
      expect(pairs.length).toBe(1);
    });

    it('should return empty array when no pairs', () => {
      const pairs = validationResults.getUnmappedPairs();

      expect(pairs).toEqual([]);
      expect(pairs.length).toBe(0);
    });
  });

  describe('status methods integration', () => {
    it('should show success status when no issues', () => {
      const summary = validationResults.getFormattedSummary();

      expect(summary).toContain('✅ Status: All validations passed');
    });

    it('should show error status when issues exist', () => {
      validationResults.addOrphanAlert(mockAlert);

      const summary = validationResults.getFormattedSummary();

      expect(summary).toContain('❌ Status: Issues found (check console for details)');
    });

    it('should calculate total issues correctly', () => {
      validationResults.addOrphanAlert(mockAlert);
      validationResults.addUnmappedPair(mockPairInfo);

      const summary = validationResults.getFormattedSummary();

      expect(summary).toContain('❌ Status: Issues found (check console for details)');
    });
  });
});

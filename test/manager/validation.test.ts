import { ValidationManager } from '../../src/manager/validation';
import { Alert, PairInfo } from '../../src/models/alert';
import { IAlertRepo } from '../../src/repo/alert';
import { IPairRepo } from '../../src/repo/pair';
import { ITickerRepo } from '../../src/repo/ticker';

describe('ValidationManager', () => {
    let validationManager: ValidationManager;
    let mockAlertRepo: jest.Mocked<IAlertRepo>;
    let mockPairRepo: jest.Mocked<IPairRepo>;
    let mockTickerRepo: jest.Mocked<ITickerRepo>;

    beforeEach(() => {
        // Initialize proper mocks with all required methods
        mockAlertRepo = {
            addAlert: jest.fn(),
            getSortedAlerts: jest.fn(),
            removeAlert: jest.fn(),
            hasAlerts: jest.fn(),
            createAlertClickEvent: jest.fn(),
            getCount: jest.fn(),
            getAllKeys: jest.fn().mockReturnValue([]),
            has: jest.fn(),
            get: jest.fn(),
            set: jest.fn(),
            delete: jest.fn(),
            clear: jest.fn(),
            load: jest.fn(),
            save: jest.fn(),
        } as unknown as jest.Mocked<IAlertRepo>;

        mockPairRepo = {
            getPairInfo: jest.fn(),
            getAllInvestingTickers: jest.fn(),
            pinPair: jest.fn(),
            getAllKeys: jest.fn().mockReturnValue([]),
            has: jest.fn(),
            get: jest.fn(),
            set: jest.fn(),
            delete: jest.fn(),
            clear: jest.fn(),
            getCount: jest.fn(),
            load: jest.fn(),
            save: jest.fn(),
        } as unknown as jest.Mocked<IPairRepo>;

        mockTickerRepo = {
            getInvestingTicker: jest.fn(),
            getTvTicker: jest.fn(),
            pinInvestingTicker: jest.fn(),
            getAllKeys: jest.fn(),
            has: jest.fn(),
            get: jest.fn(),
            set: jest.fn(),
            delete: jest.fn(),
            clear: jest.fn(),
            getCount: jest.fn(),
            load: jest.fn(),
            save: jest.fn(),
        } as unknown as jest.Mocked<ITickerRepo>;

        validationManager = new ValidationManager(
            mockAlertRepo,
            mockPairRepo,
            mockTickerRepo
        );
    });

    describe('Alert to Pair Validation', () => {
        test('should identify orphan alerts', () => {
            // Setup
            const orphanAlert = new Alert('1', 'orphanPair', 100);
            mockAlertRepo.getAllKeys.mockReturnValue(['orphanPair']);
            mockAlertRepo.get.mockImplementation((key: string) =>
                key === 'orphanPair' ? [orphanAlert] : []
            );
            mockPairRepo.getAllKeys.mockReturnValue(['HDV']);
            mockPairRepo.get.mockImplementation((key: string) =>
                key === 'HDV' ? new PairInfo('HDFC', 'otherPair', 'NSE', 'HDV') : undefined
            );

            // Execute
            const results = validationManager.validate();

            // Verify
            expect(results.getOrphanAlertCount()).toBe(1);
            expect(mockPairRepo.getAllKeys).toHaveBeenCalled();
            expect(mockPairRepo.get).toHaveBeenCalled();
        });

        test('should not flag alerts with valid pairs', () => {
            // Setup
            const validAlert = new Alert('1', 'validPair', 100);
            mockAlertRepo.getAllKeys.mockReturnValue(['validPair']);
            mockAlertRepo.get.mockImplementation((key: string) =>
                key === 'validPair' ? [validAlert] : []
            );
            mockPairRepo.getAllKeys.mockReturnValue(['HDV']);
            mockPairRepo.get.mockImplementation((key: string) =>
                key === 'HDV' ? new PairInfo('HDFC', 'validPair', 'NSE', 'HDV') : undefined
            );

            // Execute
            const results = validationManager.validate();

            // Verify
            expect(results.getOrphanAlertCount()).toBe(0);
            expect(mockPairRepo.getAllKeys).toHaveBeenCalled();
            expect(mockPairRepo.get).toHaveBeenCalled();
        });
    });

    describe('Pair to Ticker Validation', () => {
        test('should identify unmapped pairs', () => {
            // Setup
            const unmappedPair = new PairInfo('HDFC', 'pair1', 'NSE', 'HDV');
            mockPairRepo.getAllKeys.mockReturnValue(['HDV']);
            mockPairRepo.get.mockImplementation((key: string) => 
                key === 'HDV' ? unmappedPair : undefined
            );
            mockTickerRepo.getTvTicker.mockReturnValue(null);

            // Execute
            const results = validationManager.validate();

            // Verify
            expect(results.getUnmappedPairCount()).toBe(1);
            expect(mockTickerRepo.getTvTicker).toHaveBeenCalledWith('HDV');
        });

        test('should not flag pairs with valid ticker mappings', () => {
            // Setup
            const mappedPair = new PairInfo('HDFC', 'pair1', 'NSE', 'HDV');
            mockPairRepo.getAllKeys.mockReturnValue(['HDV']);
            mockPairRepo.get.mockImplementation((key: string) => 
                key === 'HDV' ? mappedPair : undefined
            );
            mockTickerRepo.getTvTicker.mockReturnValue('HDFC');

            // Execute
            const results = validationManager.validate();

            // Verify
            expect(results.getUnmappedPairCount()).toBe(0);
        });
    });

    describe('Mixed Validation Scenarios', () => {
        test('should handle null/undefined values from repositories', () => {
          // Setup
          mockAlertRepo.get.mockReturnValue([]);
          mockPairRepo.get.mockReturnValue(undefined);
          mockPairRepo.getPairInfo.mockReturnValue(null);
          mockTickerRepo.getTvTicker.mockReturnValue(null);
    
          // Execute
          const results = validationManager.validate();
    
          // Verify
          expect(results.getOrphanAlertCount()).toBe(0);
          expect(results.getUnmappedPairCount()).toBe(0);
        });
    
        test('should handle boundary conditions with maximum values', () => {
          // Setup
          const maxAlerts = Array(10000).fill(new Alert('1', 'pair1', 100));
          const maxPairs = Array(10000).fill(new PairInfo('HDFC', 'pair1', 'NSE', 'HDV'));
          
          mockAlertRepo.getAllKeys.mockReturnValue(['pair1']);
          mockAlertRepo.get.mockReturnValue(maxAlerts);
          mockPairRepo.getAllKeys.mockReturnValue(['HDV']);
          mockPairRepo.get.mockReturnValue(maxPairs[0]);
          mockPairRepo.getPairInfo.mockReturnValue(maxPairs[0]);
          mockTickerRepo.getTvTicker.mockReturnValue('HDFC');
    
          // Execute
          const results = validationManager.validate();
    
          // Verify
          expect(results.getOrphanAlertCount()).toBe(0);
          expect(results.getUnmappedPairCount()).toBe(0);
        });
    
        test('should handle empty repositories', () => {
            // Setup with empty data
            mockAlertRepo.getAllKeys.mockReturnValue([]);
            mockPairRepo.getAllKeys.mockReturnValue([]);

            // Execute
            const results = validationManager.validate();

            // Verify
            expect(results.getOrphanAlertCount()).toBe(0);
            expect(results.getUnmappedPairCount()).toBe(0);
        });

        test('should identify multiple issues simultaneously', () => {
            // Setup
            const orphanAlert = new Alert('1', 'orphanPair', 100);
            const unmappedPair = new PairInfo('HDFC', 'pair1', 'NSE', 'HDV');
            
            mockAlertRepo.getAllKeys.mockReturnValue(['orphanPair']);
            mockPairRepo.getAllKeys.mockReturnValue(['HDV']);
            
            mockAlertRepo.get.mockImplementation((key: string) => 
                key === 'orphanPair' ? [orphanAlert] : []
            );
            mockPairRepo.get.mockImplementation((key: string) => 
                key === 'HDV' ? unmappedPair : undefined
            );
            mockPairRepo.getPairInfo.mockReturnValue(null);
            mockTickerRepo.getTvTicker.mockReturnValue(null);

            // Execute
            const results = validationManager.validate();

            // Verify
            expect(results.getOrphanAlertCount()).toBe(1);
            expect(results.getUnmappedPairCount()).toBe(1);
            expect(results.getOrphanAlerts()).toContain(orphanAlert);
            expect(results.getUnmappedPairs()).toContain(unmappedPair);
        });
    });
});

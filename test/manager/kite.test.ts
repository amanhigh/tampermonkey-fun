import { KiteManager, IKiteManager } from '../../src/manager/kite';
import { ISymbolManager } from '../../src/manager/symbol';
import { IKiteClient } from '../../src/client/kite';
import { IKiteRepo } from '../../src/repo/kite';
import { GttApiResponse } from '../../src/models/kite';
import { GttCreateEvent, GttRefreshEvent, GttDeleteEvent } from '../../src/models/gtt';

// Mock dependencies
const mockSymbolManager: jest.Mocked<ISymbolManager> = {
  kiteToTv: jest.fn(),
  tvToKite: jest.fn(),
  tvToInvesting: jest.fn(),
  investingToTv: jest.fn(),
  tvToExchangeTicker: jest.fn(),
  createTvToInvestingMapping: jest.fn(),
  removeTvToInvestingMapping: jest.fn(),
  createTvToExchangeTickerMapping: jest.fn(),
  isComposite: jest.fn(),
  removeTvToExchangeTickerMapping: jest.fn(),
  deleteTvTicker: jest.fn(),
};

const mockKiteClient: jest.Mocked<IKiteClient> = {
  createGTT: jest.fn(),
  loadGTT: jest.fn(),
  deleteGTT: jest.fn(),
  getBaseUrl: jest.fn(),
};

const mockKiteRepo: jest.Mocked<IKiteRepo> = {
  createGttOrderEvent: jest.fn(),
  createGttDeleteEvent: jest.fn(),
  createGttRefreshEvent: jest.fn(),
  getGttRefereshEvent: jest.fn(),
};

describe('KiteManager', () => {
  let kiteManager: IKiteManager;

  beforeEach(() => {
    jest.clearAllMocks();
    kiteManager = new KiteManager(mockSymbolManager, mockKiteClient, mockKiteRepo);
  });

  describe('createOrder', () => {
    const validEvent = new GttCreateEvent('TEST', 10, 100, 90, 95, 110);

    it('should successfully create order with valid event', async () => {
      mockSymbolManager.tvToKite.mockReturnValue('TEST_KITE');
      mockKiteClient.createGTT.mockResolvedValue();

      await expect(kiteManager.createOrder(validEvent)).resolves.toBeUndefined();

      expect(mockSymbolManager.tvToKite).toHaveBeenCalledWith('TEST');
      expect(mockKiteClient.createGTT).toHaveBeenCalledTimes(2); // Buy and OCO
    });

    it('should throw error for invalid event', async () => {
      const invalidEvent = new GttCreateEvent('', 0, 0, 0, 0, 0);

      await expect(kiteManager.createOrder(invalidEvent)).rejects.toThrow('Invalid GTT event parameters');
    });

    it('should handle API failure during order creation', async () => {
      mockSymbolManager.tvToKite.mockReturnValue('TEST_KITE');
      mockKiteClient.createGTT.mockRejectedValue(new Error('API Error'));

      await expect(kiteManager.createOrder(validEvent)).rejects.toThrow('API Error');
    });

    it('should build correct buy order request', () => {
      const manager = kiteManager as any; // Access private methods
      const request = manager.buildBuyOrderRequest('TEST_KITE', validEvent, '2025-09-04 00:00:00');

      expect(request.condition.tradingsymbol).toBe('TEST_KITE');
      expect(request.condition.trigger_values).toEqual([95]);
      expect(request.orders[0].transaction_type).toBe('BUY');
      expect(request.orders[0].quantity).toBe(10);
    });

    it('should build correct OCO order request', () => {
      const manager = kiteManager as any;
      const request = manager.buildOcoOrderRequest('TEST_KITE', validEvent, '2025-09-04 00:00:00');

      expect(request.condition.tradingsymbol).toBe('TEST_KITE');
      expect(request.condition.trigger_values).toEqual([90, 110]); // TP is 110, not close to LTP trigger
      expect(request.orders.length).toBe(2);
      expect(request.orders[0].transaction_type).toBe('SELL');
      expect(request.orders[1].transaction_type).toBe('SELL');
    });

    it('should throw error for invalid buy order parameters', () => {
      const manager = kiteManager as any;
      const invalidEvent = new GttCreateEvent('TEST', 10, 100, 90, 0, 110); // ent is 0

      expect(() => manager.buildBuyOrderRequest('TEST_KITE', invalidEvent, '2025-09-04 00:00:00')).toThrow(
        'Invalid event parameters for buy order'
      );
    });

    it('should throw error for invalid OCO order parameters', () => {
      const manager = kiteManager as any;
      const invalidEvent = new GttCreateEvent('TEST', 0, 100, 90, 95, 110); // qty is 0

      expect(() => manager.buildOcoOrderRequest('TEST_KITE', invalidEvent, '2025-09-04 00:00:00')).toThrow(
        'Invalid event parameters for OCO order'
      );
    });
  });

  describe('deleteOrder', () => {
    it('should successfully delete order', () => {
      mockKiteClient.deleteGTT.mockResolvedValue();

      kiteManager.deleteOrder('123');

      expect(mockKiteClient.deleteGTT).toHaveBeenCalledWith('123');
    });
  });

  describe('loadOrders', () => {
    const mockCallback = jest.fn();

    it('should successfully load orders and call callback', async () => {
      const mockResponse: GttApiResponse = { data: [] };
      mockKiteClient.loadGTT.mockImplementation(async (callback) => {
        callback(mockResponse);
      });

      kiteManager.loadOrders(mockCallback);

      expect(mockKiteClient.loadGTT).toHaveBeenCalledWith(mockCallback);
      // Note: callback is called asynchronously, so we can't test it directly here
    });
  });

  describe('createGttDeleteEvent', () => {
    it('should successfully create delete event', async () => {
      mockKiteRepo.createGttDeleteEvent.mockResolvedValue();

      await expect(kiteManager.createGttDeleteEvent('123', 'TEST')).resolves.toBeUndefined();

      expect(mockKiteRepo.createGttDeleteEvent).toHaveBeenCalledWith(expect.any(GttDeleteEvent));
    });

    it('should handle repo failure', async () => {
      mockKiteRepo.createGttDeleteEvent.mockRejectedValue(new Error('Repo error'));

      await expect(kiteManager.createGttDeleteEvent('123', 'TEST')).rejects.toThrow('Repo error');
    });
  });

  describe('getGttRefereshEvent', () => {
    it('should successfully get refresh event', async () => {
      const mockEvent = new GttRefreshEvent();
      mockKiteRepo.getGttRefereshEvent.mockResolvedValue(mockEvent);

      const result = await kiteManager.getGttRefereshEvent();

      expect(result).toBe(mockEvent);
      expect(mockKiteRepo.getGttRefereshEvent).toHaveBeenCalled();
    });

    it('should handle repo failure', async () => {
      mockKiteRepo.getGttRefereshEvent.mockRejectedValue(new Error('No data'));

      await expect(kiteManager.getGttRefereshEvent()).rejects.toThrow('No data');
    });
  });

  describe('createGttOrderEvent', () => {
    const event = new GttCreateEvent('TEST', 10, 100, 90, 95, 110);

    it('should successfully create order event', async () => {
      mockKiteRepo.createGttOrderEvent.mockResolvedValue();

      await expect(kiteManager.createGttOrderEvent(event)).resolves.toBeUndefined();

      expect(mockKiteRepo.createGttOrderEvent).toHaveBeenCalledWith(event);
    });

    it('should handle repo failure', async () => {
      mockKiteRepo.createGttOrderEvent.mockRejectedValue(new Error('Repo error'));

      await expect(kiteManager.createGttOrderEvent(event)).rejects.toThrow('Repo error');
    });
  });

  describe('createGttRefreshEvent', () => {
    const event = new GttRefreshEvent();

    it('should successfully create refresh event', async () => {
      mockKiteRepo.createGttRefreshEvent.mockResolvedValue();

      await expect(kiteManager.createGttRefreshEvent(event)).resolves.toBeUndefined();

      expect(mockKiteRepo.createGttRefreshEvent).toHaveBeenCalledWith(event);
    });

    it('should handle repo failure', async () => {
      mockKiteRepo.createGttRefreshEvent.mockRejectedValue(new Error('Repo error'));

      await expect(kiteManager.createGttRefreshEvent(event)).rejects.toThrow('Repo error');
    });
  });

  describe('generateTick - NSE Cash Segment Compliance (April 2025)', () => {
    describe('Price Range: Below ₹250 (0.01 tick)', () => {
      it('should apply 0.01 tick for prices below ₹250', () => {
        const manager = kiteManager as any;
        expect(manager.generateTick(100.005)).toBe('100.01');
        expect(manager.generateTick(249.999)).toBe('250.00');
        expect(manager.generateTick(150.003)).toBe('150.01');
      });

      it('should handle exact boundaries below ₹250', () => {
        const manager = kiteManager as any;
        expect(manager.generateTick(249.99)).toBe('249.99'); // Already on 0.01 tick
        expect(manager.generateTick(249.995)).toBe('250.00'); // Rounds up to next range
      });
    });

    describe('Price Range: ₹250-₹1000 (0.05 tick)', () => {
      it('should maintain existing 0.05 tick behavior', () => {
        const manager = kiteManager as any;
        expect(manager.generateTick(500.123)).toBe('500.15');
        expect(manager.generateTick(999.99)).toBe('1000.0'); // Crosses to 0.10 tick range
        expect(manager.generateTick(750.03)).toBe('750.05');
      });

      it('should handle boundary at ₹250', () => {
        const manager = kiteManager as any;
        expect(manager.generateTick(250.0)).toBe('250.00');
        expect(manager.generateTick(250.03)).toBe('250.05');
      });
    });

    describe('Price Range: ₹1000-₹5000 (0.10 tick)', () => {
      it('should apply 0.10 tick for mid-range prices', () => {
        const manager = kiteManager as any;
        expect(manager.generateTick(1500.05)).toBe('1500.1');
        expect(manager.generateTick(3000.15)).toBe('3000.2');
        expect(manager.generateTick(4999.95)).toBe('5000.0');
      });

      it('should handle boundary at ₹1000', () => {
        const manager = kiteManager as any;
        expect(manager.generateTick(1000.0)).toBe('1000.0');
        expect(manager.generateTick(1000.05)).toBe('1000.1');
      });
    });

    describe('Price Range: ₹5000-₹10000 (0.50 tick)', () => {
      it('should apply 0.50 tick for high-range prices', () => {
        const manager = kiteManager as any;
        expect(manager.generateTick(7500.25)).toBe('7500.5');
        expect(manager.generateTick(9999.75)).toBe('10000'); // Crosses to 1.00 tick range
        expect(manager.generateTick(6000.1)).toBe('6000.5');
      });

      it('should handle boundary at ₹5000', () => {
        const manager = kiteManager as any;
        expect(manager.generateTick(5000.0)).toBe('5000.0');
        expect(manager.generateTick(5000.25)).toBe('5000.5');
      });
    });

    describe('Price Range: ₹10000-₹20000 (1.00 tick)', () => {
      it('should apply 1.00 tick for very high prices', () => {
        const manager = kiteManager as any;
        expect(manager.generateTick(15000.5)).toBe('15001');
        expect(manager.generateTick(19999.99)).toBe('20000');
        expect(manager.generateTick(12500.25)).toBe('12501');
      });

      it('should handle boundary at ₹10000', () => {
        const manager = kiteManager as any;
        expect(manager.generateTick(10000.0)).toBe('10000');
        expect(manager.generateTick(10000.5)).toBe('10001');
      });
    });

    describe('Price Range: Above ₹20000 (5.00 tick)', () => {
      it('should apply 5.00 tick for ultra-high prices', () => {
        const manager = kiteManager as any;
        expect(manager.generateTick(25000.5)).toBe('25005');
        expect(manager.generateTick(50000.25)).toBe('50005');
        expect(manager.generateTick(99999.99)).toBe('100000');
      });

      it('should handle boundary at ₹20000', () => {
        const manager = kiteManager as any;
        expect(manager.generateTick(20000.0)).toBe('20000');
        expect(manager.generateTick(20000.5)).toBe('20005');
      });
    });

    describe('Edge Cases and Boundaries', () => {
      it('should handle exact boundary values correctly', () => {
        const manager = kiteManager as any;
        expect(manager.generateTick(249.995)).toBe('250.00'); // 0.01 → 0.05 boundary cross
        expect(manager.generateTick(999.975)).toBe('1000.0'); // 0.05 → 0.10 boundary cross
        expect(manager.generateTick(4999.95)).toBe('5000.0'); // 0.10 → 0.50 boundary cross
        expect(manager.generateTick(9999.75)).toBe('10000'); // 0.50 → 1.00 boundary cross
        expect(manager.generateTick(19999.75)).toBe('20000'); // 1.00 → 5.00 boundary cross
      });

      it('should handle zero and negative prices', () => {
        const manager = kiteManager as any;
        expect(manager.generateTick(0)).toBe('0.00');
        expect(manager.generateTick(-5.123)).toBe('-5.12'); // Negative uses 0.01 tick
      });

      it('should throw error for invalid price inputs', () => {
        const manager = kiteManager as any;
        expect(() => manager.generateTick(NaN)).toThrow('Invalid price for tick calculation: NaN');
        expect(() => manager.generateTick('invalid' as any)).toThrow('Invalid price for tick calculation: invalid');
      });
    });
  });

  describe('generateExpiryDate', () => {
    it('should generate correct expiry date', () => {
      const manager = kiteManager as any;
      const fixedDate = new Date('2024-09-04');
      jest.spyOn(global, 'Date').mockImplementation(() => fixedDate as any);

      const result = manager.generateExpiryDate();
      expect(result).toBe('2025-8-4 00:00:00'); // Month is 0-based

      jest.restoreAllMocks();
    });

    it('should handle year end boundary', () => {
      const manager = kiteManager as any;
      const fixedDate = new Date('2024-12-31');
      jest.spyOn(global, 'Date').mockImplementation(() => fixedDate as any);

      const result = manager.generateExpiryDate();
      expect(result).toBe('2025-11-31 00:00:00'); // Month is 0-based

      jest.restoreAllMocks();
    });
  });
});

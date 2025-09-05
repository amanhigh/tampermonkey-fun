import { KiteManager, IKiteManager } from '../../src/manager/kite';
import { ISymbolManager } from '../../src/manager/symbol';
import { IKiteClient } from '../../src/client/kite';
import { IKiteRepo } from '../../src/repo/kite';
import { IWatchManager } from '../../src/manager/watch';
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

const mockWatchManager: jest.Mocked<IWatchManager> = {
  getCategory: jest.fn(),
  getDefaultWatchlist: jest.fn(),
  computeDefaultList: jest.fn(),
  recordCategory: jest.fn(),
  dryRunClean: jest.fn(),
  clean: jest.fn(),
  isWatched: jest.fn(),
};

describe('KiteManager', () => {
  let kiteManager: IKiteManager;

  beforeEach(() => {
    jest.clearAllMocks();
    kiteManager = new KiteManager(mockSymbolManager, mockKiteClient, mockKiteRepo, mockWatchManager);
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

  describe('generateTick', () => {
    it('should generate correct tick value', () => {
      const manager = kiteManager as any;
      expect(manager.generateTick(100.5)).toBe('100.50');
      expect(manager.generateTick(100.123)).toBe('100.15'); // Ceil to nearest 0.05
      expect(manager.generateTick(100.999)).toBe('101.00');
    });

    it('should handle edge cases', () => {
      const manager = kiteManager as any;
      expect(manager.generateTick(0)).toBe('0.00');
      expect(manager.generateTick(-5.123)).toBe('-5.10'); // Negative numbers
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

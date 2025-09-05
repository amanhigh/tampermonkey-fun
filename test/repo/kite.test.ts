import { KiteRepo, IKiteRepo } from '../../src/repo/kite';
import { GttCreateEvent, GttDeleteEvent, GttRefreshEvent } from '../../src/models/gtt';
import { Order } from '../../src/models/kite';
import { Constants } from '../../src/models/constant';

// Mock GM API
const mockGM = {
  getValue: jest.fn(),
  setValue: jest.fn(),
};

// Global GM mock
(global as any).GM = mockGM;

describe('KiteRepo', () => {
  let kiteRepo: IKiteRepo;

  beforeEach(() => {
    jest.clearAllMocks();
    kiteRepo = new KiteRepo();
  });

  describe('createGttOrderEvent', () => {
    it('should store valid GTT create event to GM storage', async () => {
      const event = new GttCreateEvent('HDFC', 10, 1500, 1450, 1520, 1550);
      mockGM.setValue.mockResolvedValue(undefined);

      await kiteRepo.createGttOrderEvent(event);

      expect(mockGM.setValue).toHaveBeenCalledWith(Constants.STORAGE.EVENTS.GTT_CREATE, event.stringify());
    });

    it('should use correct storage key (GTT_CREATE)', async () => {
      const event = new GttCreateEvent('RELIANCE', 5, 2500, 2400, 2550, 2600);
      mockGM.setValue.mockResolvedValue(undefined);

      await kiteRepo.createGttOrderEvent(event);

      expect(mockGM.setValue).toHaveBeenCalledWith('gttCreateEvent', expect.any(String));
    });

    it('should serialize event using stringify() method', async () => {
      const event = new GttCreateEvent('TCS', 2, 3200, 3100, 3250, 3300);
      const mockStringify = jest.spyOn(event, 'stringify');
      mockGM.setValue.mockResolvedValue(undefined);

      await kiteRepo.createGttOrderEvent(event);

      expect(mockStringify).toHaveBeenCalled();
    });
  });

  describe('createGttDeleteEvent', () => {
    it('should store valid GTT delete event to GM storage', async () => {
      const event = new GttDeleteEvent('order123', 'HDFC');
      mockGM.setValue.mockResolvedValue(undefined);

      await kiteRepo.createGttDeleteEvent(event);

      expect(mockGM.setValue).toHaveBeenCalledWith(Constants.STORAGE.EVENTS.GTT_DELETE, event.stringify());
    });

    it('should use correct storage key (GTT_DELETE)', async () => {
      const event = new GttDeleteEvent('order456', 'RELIANCE');
      mockGM.setValue.mockResolvedValue(undefined);

      await kiteRepo.createGttDeleteEvent(event);

      expect(mockGM.setValue).toHaveBeenCalledWith('gttDeleteEvent', expect.any(String));
    });

    it('should serialize event using stringify() method', async () => {
      const event = new GttDeleteEvent('order789', 'TCS');
      const mockStringify = jest.spyOn(event, 'stringify');
      mockGM.setValue.mockResolvedValue(undefined);

      await kiteRepo.createGttDeleteEvent(event);

      expect(mockStringify).toHaveBeenCalled();
    });
  });

  describe('createGttRefreshEvent', () => {
    it('should store valid GTT refresh event to GM storage', async () => {
      const event = new GttRefreshEvent();
      event.addOrder('HDFC', new Order('HDFC', 10, 'single', 'order1', [1500, 1450]));
      mockGM.setValue.mockResolvedValue(undefined);

      await kiteRepo.createGttRefreshEvent(event);

      expect(mockGM.setValue).toHaveBeenCalledWith(Constants.STORAGE.EVENTS.GTT_REFERSH, event.stringify());
    });

    it('should use correct storage key (GTT_REFERSH)', async () => {
      const event = new GttRefreshEvent();
      mockGM.setValue.mockResolvedValue(undefined);

      await kiteRepo.createGttRefreshEvent(event);

      expect(mockGM.setValue).toHaveBeenCalledWith('gttRefereshEvent', expect.any(String));
    });

    it('should serialize event using stringify() method', async () => {
      const event = new GttRefreshEvent();
      const mockStringify = jest.spyOn(event, 'stringify');
      mockGM.setValue.mockResolvedValue(undefined);

      await kiteRepo.createGttRefreshEvent(event);

      expect(mockStringify).toHaveBeenCalled();
    });

    it('should handle events with empty orders object', async () => {
      const event = new GttRefreshEvent();
      // event.orders is already empty
      mockGM.setValue.mockResolvedValue(undefined);

      await kiteRepo.createGttRefreshEvent(event);

      expect(mockGM.setValue).toHaveBeenCalledWith(Constants.STORAGE.EVENTS.GTT_REFERSH, expect.any(String));
    });

    it('should handle events with multiple symbols and orders', async () => {
      const event = new GttRefreshEvent();
      event.addOrder('HDFC', new Order('HDFC', 10, 'single', 'order1', [1500]));
      event.addOrder('HDFC', new Order('HDFC', 5, 'two-leg', 'order2', [1500, 1450]));
      event.addOrder('RELIANCE', new Order('RELIANCE', 2, 'single', 'order3', [2500]));
      mockGM.setValue.mockResolvedValue(undefined);

      await kiteRepo.createGttRefreshEvent(event);

      expect(mockGM.setValue).toHaveBeenCalledWith(Constants.STORAGE.EVENTS.GTT_REFERSH, expect.any(String));
    });

    it('should handle events with complex order structures', async () => {
      const event = new GttRefreshEvent();
      const complexOrder = new Order('COMPLEX', 100, 'multi-leg', 'complex123', [1000, 950, 1050, 1100, 900]);
      event.addOrder('COMPLEX', complexOrder);
      mockGM.setValue.mockResolvedValue(undefined);

      await kiteRepo.createGttRefreshEvent(event);

      expect(mockGM.setValue).toHaveBeenCalledWith(Constants.STORAGE.EVENTS.GTT_REFERSH, expect.any(String));
    });
  });

  describe('getGttRefereshEvent', () => {
    it('should retrieve stored GTT refresh event from GM storage', async () => {
      const storedEvent = new GttRefreshEvent();
      storedEvent.addOrder('HDFC', new Order('HDFC', 10, 'single', 'order1', [1500]));
      const storedData = storedEvent.stringify();

      mockGM.getValue.mockResolvedValue(storedData);

      const result = await kiteRepo.getGttRefereshEvent();

      expect(mockGM.getValue).toHaveBeenCalledWith(Constants.STORAGE.EVENTS.GTT_REFERSH);
      expect(result).toBeInstanceOf(GttRefreshEvent);
      expect(result.getOrdersForTicker('HDFC')).toHaveLength(1);
    });

    it('should use correct storage key (GTT_REFERSH)', async () => {
      const storedEvent = new GttRefreshEvent();
      const storedData = storedEvent.stringify();

      mockGM.getValue.mockResolvedValue(storedData);

      await kiteRepo.getGttRefereshEvent();

      expect(mockGM.getValue).toHaveBeenCalledWith('gttRefereshEvent');
    });

    it('should deserialize data using GttRefreshEvent.fromString()', async () => {
      const storedEvent = new GttRefreshEvent();
      const storedData = storedEvent.stringify();

      mockGM.getValue.mockResolvedValue(storedData);
      const fromStringSpy = jest.spyOn(GttRefreshEvent, 'fromString');

      await kiteRepo.getGttRefereshEvent();

      expect(fromStringSpy).toHaveBeenCalledWith(storedData);
    });

    it('should return valid GttRefreshEvent instance', async () => {
      const storedEvent = new GttRefreshEvent();
      storedEvent.addOrder('TEST', new Order('TEST', 1, 'single', 'test', [100]));
      const storedData = storedEvent.stringify();

      mockGM.getValue.mockResolvedValue(storedData);

      const result = await kiteRepo.getGttRefereshEvent();

      expect(result).toBeInstanceOf(GttRefreshEvent);
      expect(typeof result.time).toBe('number');
      expect(typeof result.orders).toBe('object');
    });

    it('should throw error when no data exists in storage', async () => {
      mockGM.getValue.mockResolvedValue(null);

      await expect(kiteRepo.getGttRefereshEvent()).rejects.toThrow('No GTT Orders Found');
    });

    it('should throw error when GM.getValue returns undefined', async () => {
      mockGM.getValue.mockResolvedValue(undefined);

      await expect(kiteRepo.getGttRefereshEvent()).rejects.toThrow('No GTT Orders Found');
    });

    it('should handle GM.getValue failure and propagate error', async () => {
      const error = new Error('Storage retrieval failed');
      mockGM.getValue.mockRejectedValue(error);

      await expect(kiteRepo.getGttRefereshEvent()).rejects.toThrow('Storage retrieval failed');
    });

    it('should handle corrupted/malformed stored data', async () => {
      mockGM.getValue.mockResolvedValue('invalid json data{');

      await expect(kiteRepo.getGttRefereshEvent()).rejects.toThrow();
      // JSON.parse will throw SyntaxError for malformed JSON
    });

    it('should handle empty string data', async () => {
      mockGM.getValue.mockResolvedValue('');

      await expect(kiteRepo.getGttRefereshEvent()).rejects.toThrow();
    });
  });

  describe('Event Lifecycle Integration', () => {
    it('should store and retrieve GTT refresh event successfully', async () => {
      const originalEvent = new GttRefreshEvent();
      originalEvent.addOrder('HDFC', new Order('HDFC', 10, 'single', 'order1', [1500, 1450]));
      originalEvent.addOrder('RELIANCE', new Order('RELIANCE', 5, 'two-leg', 'order2', [2500, 2400]));

      mockGM.setValue.mockResolvedValue(undefined);
      await kiteRepo.createGttRefreshEvent(originalEvent);

      const storedData = mockGM.setValue.mock.calls[0][1];
      mockGM.getValue.mockResolvedValue(storedData);

      const retrievedEvent = await kiteRepo.getGttRefereshEvent();

      expect(retrievedEvent).toBeInstanceOf(GttRefreshEvent);
      expect(retrievedEvent.getOrdersForTicker('HDFC')).toHaveLength(1);
      expect(retrievedEvent.getOrdersForTicker('RELIANCE')).toHaveLength(1);
      expect(retrievedEvent.getCount()).toBe(2);
    });

    it('should maintain data integrity through store/retrieve cycle', async () => {
      const originalEvent = new GttRefreshEvent();
      const originalTime = originalEvent.time;
      originalEvent.addOrder('TEST', new Order('TEST', 42, 'test-type', 'test-id', [100, 200, 300]));

      mockGM.setValue.mockResolvedValue(undefined);
      await kiteRepo.createGttRefreshEvent(originalEvent);

      const storedData = mockGM.setValue.mock.calls[0][1];
      mockGM.getValue.mockResolvedValue(storedData);

      const retrievedEvent = await kiteRepo.getGttRefereshEvent();

      expect(retrievedEvent.time).toBe(originalTime);
      const orders = retrievedEvent.getOrdersForTicker('TEST');
      expect(orders).toHaveLength(1);
      expect(orders[0].sym).toBe('TEST');
      expect(orders[0].qty).toBe(42);
      expect(orders[0].type).toBe('test-type');
      expect(orders[0].id).toBe('test-id');
      expect(orders[0].prices).toEqual([100, 200, 300]);
    });

    it('should handle multiple event types independently', async () => {
      // Create different events
      const createEvent = new GttCreateEvent('HDFC', 10, 1500, 1450, 1520, 1550);
      const deleteEvent = new GttDeleteEvent('order123', 'HDFC');
      const refreshEvent = new GttRefreshEvent();

      mockGM.setValue.mockResolvedValue(undefined);

      // Store all events
      await kiteRepo.createGttOrderEvent(createEvent);
      await kiteRepo.createGttDeleteEvent(deleteEvent);
      await kiteRepo.createGttRefreshEvent(refreshEvent);

      // Verify each used different storage keys
      expect(mockGM.setValue).toHaveBeenCalledWith(Constants.STORAGE.EVENTS.GTT_CREATE, expect.any(String));
      expect(mockGM.setValue).toHaveBeenCalledWith(Constants.STORAGE.EVENTS.GTT_DELETE, expect.any(String));
      expect(mockGM.setValue).toHaveBeenCalledWith(Constants.STORAGE.EVENTS.GTT_REFERSH, expect.any(String));
    });

    it('should not interfere with other storage keys', async () => {
      const event = new GttRefreshEvent();
      mockGM.setValue.mockResolvedValue(undefined);

      await kiteRepo.createGttRefreshEvent(event);

      // Verify only the GTT_REFERSH key was used
      expect(mockGM.setValue).toHaveBeenCalledWith(Constants.STORAGE.EVENTS.GTT_REFERSH, expect.any(String));
      expect(mockGM.setValue).toHaveBeenCalledTimes(1);
    });
  });

  describe('GM API Error Scenarios', () => {
    it('should handle GM.setValue network failures', async () => {
      const event = new GttRefreshEvent();
      const networkError = new Error('Network timeout');
      mockGM.setValue.mockRejectedValue(networkError);

      await expect(kiteRepo.createGttRefreshEvent(event)).rejects.toThrow('Network timeout');
    });

    it('should handle GM.getValue network failures', async () => {
      const networkError = new Error('Connection failed');
      mockGM.getValue.mockRejectedValue(networkError);

      await expect(kiteRepo.getGttRefereshEvent()).rejects.toThrow('Connection failed');
    });

    it('should handle GM API permission errors', async () => {
      const permissionError = new Error('Permission denied');
      mockGM.setValue.mockRejectedValue(permissionError);

      const event = new GttRefreshEvent();
      await expect(kiteRepo.createGttRefreshEvent(event)).rejects.toThrow('Permission denied');
    });

    it('should handle GM storage quota exceeded', async () => {
      const quotaError = new Error('Storage quota exceeded');
      mockGM.setValue.mockRejectedValue(quotaError);

      const event = new GttRefreshEvent();
      await expect(kiteRepo.createGttRefreshEvent(event)).rejects.toThrow('Storage quota exceeded');
    });
  });
});

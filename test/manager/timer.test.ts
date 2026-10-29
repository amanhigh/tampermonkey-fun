import { EventBus } from '../../src/manager/event_bus';
import { TimerManager } from '../../src/manager/timer';
import { Constants } from '../../src/models/constant';
import { DomainEventType } from '../../src/models/domain_event';
import { Notifier } from '../../src/util/notify';

// Mock Notifier to avoid DOM issues
jest.mock('../../src/util/notify', () => ({
  Notifier: {
    success: jest.fn(),
    yellow: jest.fn(),
  },
}));

const mockSaveElement = { length: 1, click: jest.fn() };
const mockJQuery = jest.fn(() => mockSaveElement);

// Setup global $
(global as any).$ = mockJQuery;

describe('TimerManager', () => {
  let eventBus: EventBus;
  let manager: TimerManager;
  let timerHandler: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockJQuery.mockImplementation(() => mockSaveElement);
    jest.useFakeTimers();
    eventBus = new EventBus();
    manager = new TimerManager(eventBus);
    timerHandler = jest.fn();
    eventBus.subscribe(DomainEventType.TIMER, timerHandler);
    manager.registerEvents(eventBus);
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  describe('registerEvents', () => {
    it('should not schedule ticks before FIRST_LOAD', () => {
      jest.advanceTimersByTime(180000);

      expect(timerHandler).not.toHaveBeenCalled();
    });

    it('should publish the first TIMER one interval after FIRST_LOAD', () => {
      void eventBus.publish({ type: DomainEventType.FIRST_LOAD, ticker: 'TV:INFY' });

      jest.advanceTimersByTime(59999);
      expect(timerHandler).not.toHaveBeenCalled();

      jest.advanceTimersByTime(1);
      expect(timerHandler).toHaveBeenCalledTimes(1);
      expect(timerHandler).toHaveBeenCalledWith({ type: DomainEventType.TIMER });
    });

    it('should keep ticking on every interval', () => {
      void eventBus.publish({ type: DomainEventType.FIRST_LOAD, ticker: 'TV:INFY' });

      jest.advanceTimersByTime(60000);
      expect(timerHandler).toHaveBeenCalledTimes(1);

      jest.advanceTimersByTime(60000);
      expect(timerHandler).toHaveBeenCalledTimes(2);

      jest.advanceTimersByTime(180000);
      expect(timerHandler).toHaveBeenCalledTimes(5);
    });

    it('should keep a single timer across repeated FIRST_LOAD events', () => {
      void eventBus.publish({ type: DomainEventType.FIRST_LOAD, ticker: 'TV:INFY' });
      void eventBus.publish({ type: DomainEventType.FIRST_LOAD, ticker: 'TV:TCS' });
      void eventBus.publish({ type: DomainEventType.FIRST_LOAD, ticker: 'TV:INFY' });

      jest.advanceTimersByTime(60000);
      expect(timerHandler).toHaveBeenCalledTimes(1);

      jest.advanceTimersByTime(60000);
      expect(timerHandler).toHaveBeenCalledTimes(2);
    });
  });

  describe('autosave', () => {
    it('should click the save button and notify on every tick', () => {
      void eventBus.publish({ type: DomainEventType.FIRST_LOAD, ticker: 'TV:INFY' });

      jest.advanceTimersByTime(60000);

      expect(mockJQuery).toHaveBeenCalledWith(Constants.DOM.HEADER.SAVE);
      expect(mockSaveElement.click).toHaveBeenCalledTimes(1);
      expect(Notifier.success).toHaveBeenCalledWith('Workspace saved');

      jest.advanceTimersByTime(60000);

      expect(mockSaveElement.click).toHaveBeenCalledTimes(2);
      expect(Notifier.success).toHaveBeenCalledTimes(2);
    });

    it('should not click and should not throw when the save button is missing', () => {
      const missingElement = { length: 0, click: jest.fn() };
      mockJQuery.mockImplementation(() => missingElement);
      void eventBus.publish({ type: DomainEventType.FIRST_LOAD, ticker: 'TV:INFY' });

      expect(() => jest.advanceTimersByTime(60000)).not.toThrow();
      expect(missingElement.click).not.toHaveBeenCalled();
      expect(Notifier.success).toHaveBeenCalledWith('Workspace saved');
    });
  });

  describe('publish behaviour', () => {
    it('should not block later ticks on a pending consumer', () => {
      eventBus.subscribe(DomainEventType.TIMER, () => new Promise<void>(() => undefined));
      void eventBus.publish({ type: DomainEventType.FIRST_LOAD, ticker: 'TV:INFY' });

      jest.advanceTimersByTime(60000);
      expect(timerHandler).toHaveBeenCalledTimes(1);

      jest.advanceTimersByTime(60000);
      expect(timerHandler).toHaveBeenCalledTimes(2);
    });
  });
});

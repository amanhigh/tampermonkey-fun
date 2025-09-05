import { AlertRepo, IAlertRepo } from '../../src/repo/alert';
import { IRepoCron } from '../../src/repo/cron';
import { Alert } from '../../src/models/alert';
import { AlertClicked, AlertClickAction } from '../../src/models/events';
import { Constants } from '../../src/models/constant';

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

describe('AlertRepo', () => {
  let alertRepo: IAlertRepo;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockGM.getValue.mockResolvedValue({});
    mockGM.setValue.mockResolvedValue(undefined);
    alertRepo = new AlertRepo(mockRepoCron);
  });

  describe('constructor and initialization', () => {
    it('should register with repoCron', () => {
      expect(mockRepoCron.registerRepository).toHaveBeenCalledWith(alertRepo);
    });

    it('should initialize with empty maps', async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(alertRepo.getCount()).toBe(0);
      expect(alertRepo.getAllKeys()).toEqual([]);
    });
  });

  describe('alert validation', () => {
    beforeEach(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
      alertRepo.clear();
    });

    it('should add valid alert', () => {
      const alert = new Alert('alert1', 'pair1', 100);
      alertRepo.addAlert('pair1', alert);

      const alerts = alertRepo.get('pair1');
      expect(alerts).toHaveLength(1);
      expect(alerts![0]).toBe(alert);
    });

    it('should throw error for invalid alert with missing price', () => {
      const invalidAlert = new Alert('alert1', 'pair1', 0);
      expect(() => alertRepo.addAlert('pair1', invalidAlert)).toThrow('Invalid alert object');
    });

    it('should throw error for invalid alert with missing pairId', () => {
      const invalidAlert = new Alert('alert1', '', 100);
      expect(() => alertRepo.addAlert('pair1', invalidAlert)).toThrow('Invalid alert object');
    });

    it('should throw error for null alert', () => {
      expect(() => alertRepo.addAlert('pair1', null as any)).toThrow();
    });
  });

  describe('alert sorting and aggregation', () => {
    beforeEach(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
      alertRepo.clear();
    });

    it('should sort alerts by price ascending', () => {
      const alert1 = new Alert('alert1', 'pair1', 150);
      const alert2 = new Alert('alert2', 'pair1', 100);
      const alert3 = new Alert('alert3', 'pair1', 125);

      alertRepo.addAlert('pair1', alert1);
      alertRepo.addAlert('pair1', alert2);
      alertRepo.addAlert('pair1', alert3);

      const sortedAlerts = alertRepo.getSortedAlerts('pair1');
      expect(sortedAlerts).toHaveLength(3);
      expect(sortedAlerts[0].price).toBe(100);
      expect(sortedAlerts[1].price).toBe(125);
      expect(sortedAlerts[2].price).toBe(150);
    });

    it('should return empty array for pair with no alerts', () => {
      const sortedAlerts = alertRepo.getSortedAlerts('nonexistent');
      expect(sortedAlerts).toEqual([]);
    });

    it('should handle single alert sorting', () => {
      const alert = new Alert('alert1', 'pair1', 100);
      alertRepo.addAlert('pair1', alert);

      const sortedAlerts = alertRepo.getSortedAlerts('pair1');
      expect(sortedAlerts).toHaveLength(1);
      expect(sortedAlerts[0]).toBe(alert);
    });
  });

  describe('alert removal', () => {
    beforeEach(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
      alertRepo.clear();
    });

    it('should remove specific alert by ID', () => {
      const alert1 = new Alert('alert1', 'pair1', 100);
      const alert2 = new Alert('alert2', 'pair1', 150);

      alertRepo.addAlert('pair1', alert1);
      alertRepo.addAlert('pair1', alert2);

      alertRepo.removeAlert('pair1', 'alert1');

      const remainingAlerts = alertRepo.get('pair1');
      expect(remainingAlerts).toHaveLength(1);
      expect(remainingAlerts![0]).toBe(alert2);
    });

    it('should handle removing non-existent alert', () => {
      const alert = new Alert('alert1', 'pair1', 100);
      alertRepo.addAlert('pair1', alert);

      alertRepo.removeAlert('pair1', 'nonexistent');

      const remainingAlerts = alertRepo.get('pair1');
      expect(remainingAlerts).toHaveLength(1);
    });

    it('should handle removing from non-existent pair', () => {
      alertRepo.removeAlert('nonexistent', 'alert1');
      expect(alertRepo.has('nonexistent')).toBe(true); // Creates empty array
      expect(alertRepo.get('nonexistent')).toEqual([]);
    });
  });

  describe('alert presence checks', () => {
    beforeEach(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
      alertRepo.clear();
    });

    it('should return true when pair has alerts', () => {
      const alert = new Alert('alert1', 'pair1', 100);
      alertRepo.addAlert('pair1', alert);

      expect(alertRepo.hasAlerts('pair1')).toBe(true);
    });

    it('should return false when pair has no alerts', () => {
      expect(alertRepo.hasAlerts('pair1')).toBe(false);
    });

    it('should return false when pair exists but has empty alert array', () => {
      alertRepo.set('pair1', []);
      expect(alertRepo.hasAlerts('pair1')).toBe(false);
    });
  });

  describe('alert count aggregation', () => {
    beforeEach(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
      alertRepo.clear();
    });

    it('should count total alerts across all pairs', () => {
      alertRepo.addAlert('pair1', new Alert('alert1', 'pair1', 100));
      alertRepo.addAlert('pair1', new Alert('alert2', 'pair1', 150));
      alertRepo.addAlert('pair2', new Alert('alert3', 'pair2', 200));

      expect(alertRepo.getAlertCount()).toBe(3);
    });

    it('should return 0 when no alerts exist', () => {
      expect(alertRepo.getAlertCount()).toBe(0);
    });

    it('should handle pairs with empty alert arrays', () => {
      alertRepo.set('pair1', []);
      alertRepo.addAlert('pair2', new Alert('alert1', 'pair2', 100));

      expect(alertRepo.getAlertCount()).toBe(1);
    });
  });

  describe('alert click events', () => {
    it('should create and store alert click event', async () => {
      const event = new AlertClicked('HDFC', AlertClickAction.OPEN);

      await alertRepo.createAlertClickEvent(event);

      expect(mockGM.setValue).toHaveBeenCalledWith(Constants.STORAGE.EVENTS.ALERT_CLICKED, event.stringify());
    });

    it('should handle different click actions', async () => {
      const openEvent = new AlertClicked('HDFC', AlertClickAction.OPEN);
      const mapEvent = new AlertClicked('AAPL', AlertClickAction.MAP);

      await alertRepo.createAlertClickEvent(openEvent);
      await alertRepo.createAlertClickEvent(mapEvent);

      expect(mockGM.setValue).toHaveBeenCalledTimes(2);
    });
  });

  describe('multiple pairs management', () => {
    beforeEach(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
      alertRepo.clear();
    });

    it('should manage alerts for multiple pairs independently', () => {
      const alert1 = new Alert('alert1', 'pair1', 100);
      const alert2 = new Alert('alert2', 'pair2', 200);

      alertRepo.addAlert('pair1', alert1);
      alertRepo.addAlert('pair2', alert2);

      expect(alertRepo.getSortedAlerts('pair1')).toEqual([alert1]);
      expect(alertRepo.getSortedAlerts('pair2')).toEqual([alert2]);
      expect(alertRepo.getAlertCount()).toBe(2);
    });

    it('should handle pair-specific operations', () => {
      alertRepo.addAlert('pair1', new Alert('alert1', 'pair1', 100));
      alertRepo.addAlert('pair1', new Alert('alert2', 'pair1', 150));
      alertRepo.addAlert('pair2', new Alert('alert3', 'pair2', 200));

      alertRepo.removeAlert('pair1', 'alert1');

      expect(alertRepo.getSortedAlerts('pair1')).toHaveLength(1);
      expect(alertRepo.getSortedAlerts('pair2')).toHaveLength(1);
      expect(alertRepo.getAlertCount()).toBe(2);
    });
  });
});

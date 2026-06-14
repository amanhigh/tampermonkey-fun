import { AlertSummaryHandler } from '../../src/handler/alert_summary';
import { IAlertManager } from '../../src/manager/alert';
import { ITradingViewManager } from '../../src/manager/tv';
import { IUIUtil } from '../../src/util/ui';
import { Alert } from '../../src/models/alert';
import { Notifier } from '../../src/util/notify';

// ── Mock jQuery ──
let mockContainerEl: any;
const mockJQuery = jest.fn((selector: string) => {
  if (selector === '#aman-alerts') {
    return mockContainerEl;
  }
  return {
    empty: jest.fn(),
    append: jest.fn().mockReturnThis(),
    appendTo: jest.fn().mockReturnThis(),
    html: jest.fn(),
    on: jest.fn().mockReturnThis(),
    remove: jest.fn(),
    addClass: jest.fn().mockReturnThis(),
  };
});
(global as any).$ = mockJQuery;

// ── Mock Notifier ──
jest.mock('../../src/util/notify', () => ({
  Notifier: {
    info: jest.fn(),
    success: jest.fn(),
    warn: jest.fn(),
    red: jest.fn(),
    message: jest.fn(),
  },
}));

describe('AlertSummaryHandler', () => {
  let handler: AlertSummaryHandler;
  let mockAlertManager: jest.Mocked<IAlertManager>;
  let mockTvManager: jest.Mocked<ITradingViewManager>;
  let mockUiUtil: jest.Mocked<IUIUtil>;
  let mockButton: any;

  const makeAlert = (overrides: Partial<Alert> = {}): Alert =>
    new Alert(
      overrides.id ?? 'alert-id-1',
      overrides.pairId ?? 'pair1',
      overrides.price ?? 100,
      overrides.name ?? 'Test Alert'
    );

  beforeEach(() => {
    mockContainerEl = {
      empty: jest.fn(),
      append: jest.fn(),
      appendTo: jest.fn(),
    };

    mockButton = {
      on: jest.fn().mockReturnThis(),
      addClass: jest.fn().mockReturnThis(),
      remove: jest.fn(),
      appendTo: jest.fn().mockReturnThis(),
    };

    mockAlertManager = {
      deleteAlert: jest.fn().mockResolvedValue(undefined),
    } as any;

    mockTvManager = {
      getLastTradedPrice: jest.fn().mockReturnValue(200),
    } as any;

    mockUiUtil = {
      buildButton: jest.fn().mockReturnValue(mockButton),
      buildLabel: jest.fn().mockReturnValue({
        addClass: jest.fn().mockReturnThis(),
        appendTo: jest.fn().mockReturnThis(),
      }),
      colorText: jest.fn((text: string) => `<span>${text}</span>`),
    } as any;

    handler = new AlertSummaryHandler(mockAlertManager, mockTvManager, mockUiUtil);
  });

  // ── States ──

  describe('displayAlerts', () => {
    it('should render 🔴 No Alerts when alerts list is empty', () => {
      handler.displayAlerts([]);

      expect(mockContainerEl.empty).toHaveBeenCalled();
      expect(mockUiUtil.buildLabel).toHaveBeenCalledWith('🔴 No Alerts', 'red');
    });

    it('should render ⚠️ No Pair when alerts is null', () => {
      handler.displayAlerts(null);

      expect(mockContainerEl.empty).toHaveBeenCalled();
      expect(mockUiUtil.buildLabel).toHaveBeenCalledWith('⚠️ No Pair', 'orange');
    });

    it('should render green low-alert pill when price is below LTP', () => {
      const alert = makeAlert({ price: 100 });
      mockTvManager.getLastTradedPrice.mockReturnValue(200);

      handler.displayAlerts([alert]);

      expect(mockUiUtil.colorText).toHaveBeenCalledWith('🟢 100', 'seagreen');
      expect(mockUiUtil.buildButton).toHaveBeenCalledWith('', '<span>🟢 100</span>');
      expect(mockButton.addClass).toHaveBeenCalledWith('aman-alert-low');
    });

    it('should render red high-alert pill when price is above LTP', () => {
      const alert = makeAlert({ price: 300 });
      mockTvManager.getLastTradedPrice.mockReturnValue(200);

      handler.displayAlerts([alert]);

      expect(mockUiUtil.colorText).toHaveBeenCalledWith('🔴 300', 'red');
      expect(mockButton.addClass).toHaveBeenCalledWith('aman-alert-high');
    });

    it('should render orange pending-alert pill when alert id is empty', () => {
      const alert = makeAlert({ id: '', price: 150 });

      handler.displayAlerts([alert]);

      expect(mockUiUtil.colorText).toHaveBeenCalledWith('🟠 150', 'orange');
      expect(mockButton.addClass).toHaveBeenCalledWith('aman-alert-pending');
    });

    it('should render multiple alerts as separate pills', () => {
      mockTvManager.getLastTradedPrice.mockReturnValue(200);
      const alertLow = makeAlert({ price: 100, pairId: 'pair1' });
      const alertHigh = makeAlert({ price: 300, pairId: 'pair2' });

      handler.displayAlerts([alertLow, alertHigh]);

      // Two buttons should be created
      expect(mockUiUtil.buildButton).toHaveBeenCalledTimes(2);
    });
  });

  // ── Click / Delete Behavior ──

  describe('click behavior', () => {
    it('should warn when clicking a pending alert', () => {
      const alert = makeAlert({ id: '', price: 150 });
      handler.displayAlerts([alert]);

      // Extract click handler
      const clickHandler = mockButton.on.mock.calls[0][1];
      clickHandler();

      expect(Notifier.warn).toHaveBeenCalledWith('Pending alerts cannot be deleted');
      expect(mockAlertManager.deleteAlert).not.toHaveBeenCalled();
    });

    it('should delete non-pending alert on click', async () => {
      const alert = makeAlert({ id: 'alert-1', price: 100 });
      mockAlertManager.deleteAlert.mockResolvedValue(undefined);
      handler.displayAlerts([alert]);

      const clickHandler = mockButton.on.mock.calls[0][1];
      clickHandler(); // voided — does not return promise

      // Wait for microtask queue (the voided .then() callbacks)
      await new Promise((r) => setTimeout(r, 0));

      expect(mockAlertManager.deleteAlert).toHaveBeenCalledWith('alert-1');
      expect(Notifier.red).toHaveBeenCalledWith('❌ Alert deleted: 100');
      expect(mockButton.remove).toHaveBeenCalled();
    });
  });
});

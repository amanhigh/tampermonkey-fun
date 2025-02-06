import { KiteHandler } from '../../src/handler/kite';
import { IKiteManager } from '../../src/manager/kite';
import { ISymbolManager } from '../../src/manager/symbol';
import { IWaitUtil } from '../../src/util/wait';
import { ITickerManager } from '../../src/manager/ticker';
import { ITradingViewManager } from '../../src/manager/tv';
import { IUIUtil } from '../../src/util/ui';
import { Constants } from '../../src/models/constant';

describe('KiteHandler', () => {
  let kiteHandler: KiteHandler;
  let kiteManagerMock: jest.Mocked<IKiteManager>;
  let symbolManagerMock: jest.Mocked<ISymbolManager>;
  let waitUtilMock: jest.Mocked<IWaitUtil>;
  let tickerManagerMock: jest.Mocked<ITickerManager>;
  let tvManagerMock: jest.Mocked<ITradingViewManager>;
  let uiUtilMock: jest.Mocked<IUIUtil>;

  beforeEach(() => {
    kiteManagerMock = {
      createOrder: jest.fn(),
      createGttOrderEvent: jest.fn(),
      createGttDeleteEvent: jest.fn(),
      deleteOrder: jest.fn(),
      getGttRefereshEvent: jest.fn(),
      createGttRefreshEvent: jest.fn(),
      loadOrders: jest.fn(),
    } as any;
    symbolManagerMock = {
      tvToKite: jest.fn(),
      kiteToTv: jest.fn(),
    } as any;
    waitUtilMock = {
      waitJEE: jest.fn(),
    } as any;
    tickerManagerMock = {
      getTicker: jest.fn(),
    } as any;
    tvManagerMock = {
      getLastTradedPrice: jest.fn(),
    } as any;
    uiUtilMock = {
      buildButton: jest.fn(),
    } as any;

    kiteHandler = new KiteHandler(
      kiteManagerMock,
      symbolManagerMock,
      waitUtilMock,
      tickerManagerMock,
      tvManagerMock,
      uiUtilMock
    );

    // Mock Constants.TRADING.ORDER.RISK_LIMIT
    Object.defineProperty(Constants.TRADING.ORDER, 'RISK_LIMIT', { value: 1000 });
  });

  describe('calculateQuantity', () => {
    it('should calculate quantity correctly', () => {
      const entryPrice = 100;
      const stopPrice = 90;
      const expectedRisk = 10;
      const expectedQty = 100;
      const expectedDoubleQty = 200;

      const { risk, qty, doubleQty } = kiteHandler.calculateQuantity(entryPrice, stopPrice);

      expect(qty).toBe(expectedQty);
      expect(risk).toBe(expectedRisk);
      expect(doubleQty).toBe(expectedDoubleQty);
    });
  });
});
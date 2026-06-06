import { KiteHandler } from '../../src/handler/kite';
import { IKiteManager } from '../../src/manager/kite';
import { IWaitUtil } from '../../src/util/wait';
import { IDomManager } from '../../src/manager/dom';
import { ITradingViewManager } from '../../src/manager/tv';
import { IUIUtil } from '../../src/util/ui';

describe('KiteHandler', () => {
  let kiteManagerMock: jest.Mocked<IKiteManager>;
  let waitUtilMock: jest.Mocked<IWaitUtil>;
  let tickerManagerMock: jest.Mocked<IDomManager>;
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
      kiteToTv: jest.fn(),
      tvToKite: jest.fn(),
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
  });

  it('should create instance with all dependencies', () => {
    const handler = new KiteHandler(
      kiteManagerMock, waitUtilMock, tickerManagerMock, tvManagerMock, uiUtilMock
    );
    expect(handler).toBeDefined();
    expect(handler).toBeInstanceOf(KiteHandler);
  });
});

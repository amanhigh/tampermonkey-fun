jest.mock('../../src/core/factory', () => ({
  Factory: { app: { barkat: jest.fn() } },
}));

import { Barkat } from '../../src/core/barkat';
import { UIUtil } from '../../src/util/ui';
import { IOnLoadHandler } from '../../src/handler/onload';
import { IJournalHandler } from '../../src/handler/journal';
import { IJournalSyncHandler } from '../../src/handler/journal_sync';
import { ICommandInputHandler } from '../../src/handler/command';
import { IKiteHandler } from '../../src/handler/kite';
import { IAlertFeedHandler } from '../../src/handler/alertfeed';
import { IGlobalErrorHandler } from '../../src/handler/error';
import { IDashboardSyncHandler } from '../../src/handler/dashboard_sync';
import { ITradingViewManager } from '../../src/manager/tv';
import { IToolbarHandler } from '../../src/handler/toolbar';

describe('Barkat', () => {
  const originalWindowDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'window');

  afterEach(() => {
    if (originalWindowDescriptor) {
      Object.defineProperty(globalThis, 'window', originalWindowDescriptor);
    } else {
      Reflect.deleteProperty(globalThis, 'window');
    }
  });

  function createApp(origin: string) {
    const { host } = new URL(origin);
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: { location: { origin, host } },
    });

    const errorHandlerMock: jest.Mocked<IGlobalErrorHandler> = {
      registerGlobalErrorHandlers: jest.fn(),
    };
    const journalSyncHandlerMock: jest.Mocked<IJournalSyncHandler> = {
      publishBarkatJournalOpen: jest.fn(),
      publishTvJournalRecorded: jest.fn(),
      registerBarkatJournalOpenListener: jest.fn(),
      registerTvJournalRecordedListener: jest.fn(),
    };
    const dashboardSyncHandlerMock: jest.Mocked<IDashboardSyncHandler> = {
      registerEvents: jest.fn(),
      registerDashyListner: jest.fn(),
    };

    const app = new Barkat(
      errorHandlerMock,
      {} as UIUtil,
      {} as IToolbarHandler,
      {} as IOnLoadHandler,
      {} as IJournalHandler,
      journalSyncHandlerMock,
      {} as ICommandInputHandler,
      {} as IKiteHandler,
      {} as IAlertFeedHandler,
      dashboardSyncHandlerMock,
      {} as ITradingViewManager
    );

    return { app, errorHandlerMock, journalSyncHandlerMock, dashboardSyncHandlerMock };
  }

  it('activates only the dashboard on the Barkat dashboard origin', () => {
    const { app, errorHandlerMock, journalSyncHandlerMock, dashboardSyncHandlerMock } =
      createApp('http://barkat.app.lan');

    app.initialize();

    expect(errorHandlerMock.registerGlobalErrorHandlers).toHaveBeenCalledTimes(1);
    expect(dashboardSyncHandlerMock.registerDashyListner).toHaveBeenCalledTimes(1);
    expect(journalSyncHandlerMock.publishBarkatJournalOpen).not.toHaveBeenCalled();
    expect(journalSyncHandlerMock.registerTvJournalRecordedListener).not.toHaveBeenCalled();
  });

  it('activates only the journal on the localhost journal origin', () => {
    const { app, journalSyncHandlerMock, dashboardSyncHandlerMock } = createApp('http://localhost:9091');

    app.initialize();

    expect(journalSyncHandlerMock.publishBarkatJournalOpen).toHaveBeenCalledTimes(1);
    expect(journalSyncHandlerMock.registerTvJournalRecordedListener).toHaveBeenCalledTimes(1);
    expect(dashboardSyncHandlerMock.registerDashyListner).not.toHaveBeenCalled();
  });

  it('does not activate anything on an unrelated host with a lookalike port', () => {
    const { app, journalSyncHandlerMock, dashboardSyncHandlerMock } = createApp('http://unrelated.example:8050');

    app.initialize();

    expect(dashboardSyncHandlerMock.registerDashyListner).not.toHaveBeenCalled();
    expect(journalSyncHandlerMock.publishBarkatJournalOpen).not.toHaveBeenCalled();
    expect(journalSyncHandlerMock.registerTvJournalRecordedListener).not.toHaveBeenCalled();
  });

  it('does not activate the dashboard on a lookalike hostname', () => {
    const { app, journalSyncHandlerMock, dashboardSyncHandlerMock } = createApp(
      'http://barkat.app.lan.example.com'
    );

    app.initialize();

    expect(dashboardSyncHandlerMock.registerDashyListner).not.toHaveBeenCalled();
    expect(journalSyncHandlerMock.publishBarkatJournalOpen).not.toHaveBeenCalled();
  });
});

import { CommandInputHandler } from '../../src/handler/command';
import { IAlertHandler } from '../../src/handler/alert';
import { ITickerHandler } from '../../src/handler/ticker';
import { Notifier } from '../../src/util/notify';

jest.mock('../../src/util/notify', () => ({
  Notifier: {
    info: jest.fn(),
  },
}));

describe('CommandInputHandler', () => {
  let handler: CommandInputHandler;
  let mockTickerHandler: jest.Mocked<ITickerHandler>;
  let mockAlertHandler: jest.Mocked<IAlertHandler>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockTickerHandler = {
      openTicker: jest.fn(),
      processCommand: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<ITickerHandler>;
    mockAlertHandler = {
      createAlertsFromTextBox: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<IAlertHandler>;

    (globalThis as unknown as { $: unknown }).$ = (target: { value: string }) => ({
      val: jest.fn((value?: string) => (value === undefined ? target.value : undefined)),
    });

    handler = new CommandInputHandler(mockTickerHandler, mockAlertHandler);
  });

  const inputEvent = (value: string, keyCode: number): JQuery.TriggeredEvent =>
    ({ target: { value }, keyCode }) as JQuery.TriggeredEvent;

  test('routes E=NSE commands only after Enter', async () => {
    await handler.handleInput(inputEvent('E=NSE', 65));
    expect(mockTickerHandler.processCommand).not.toHaveBeenCalled();

    await handler.handleInput(inputEvent('E=NSE', 13));
    expect(mockTickerHandler.processCommand).toHaveBeenCalledWith('E', 'NSE');
  });

  test('routes numeric prices only after Enter', async () => {
    await handler.handleInput(inputEvent('100.5 102.3', 65));
    expect(mockAlertHandler.createAlertsFromTextBox).not.toHaveBeenCalled();

    await handler.handleInput(inputEvent('100.5 102.3', 13));
    expect(mockAlertHandler.createAlertsFromTextBox).toHaveBeenCalledWith('100.5 102.3');
  });

  test('treats HDFCxox as unknown instead of opening a ticker', async () => {
    await handler.handleInput(inputEvent('HDFCxox', 13));

    expect(mockTickerHandler.openTicker).not.toHaveBeenCalled();
    expect(Notifier.info).toHaveBeenCalledWith(expect.not.stringContaining('xox'));
  });

});

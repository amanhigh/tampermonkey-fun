jest.mock('../../src/util/ui', () => ({ UIUtil: jest.fn() }));
jest.mock('../../src/util/key', () => ({ KeyUtil: jest.fn() }));
jest.mock('../../src/util/sync', () => ({ SyncUtil: jest.fn() }));
jest.mock('../../src/util/notify', () => ({ Notifier: { info: jest.fn() } }));

import { UIUtil } from '../../src/util/ui';
import { KeyUtil } from '../../src/util/key';
import { SyncUtil } from '../../src/util/sync';
import { ExperimentApp, RunExperiment } from '../../src/core/experiment';

const uiUtilMock = UIUtil as unknown as jest.Mock;
const keyUtilMock = KeyUtil as unknown as jest.Mock;
const syncUtilMock = SyncUtil as unknown as jest.Mock;

describe('ExperimentApp startup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not start the experiment when the module is only imported', () => {
    // A fresh module registry re-runs the entry import against its own mock
    // instances, so the isolated constructors must be asserted, not the outer ones.
    jest.isolateModules(() => {
      const { UIUtil: IsolatedUIUtil } = require('../../src/util/ui') as { UIUtil: jest.Mock };
      const { KeyUtil: IsolatedKeyUtil } = require('../../src/util/key') as { KeyUtil: jest.Mock };
      const { SyncUtil: IsolatedSyncUtil } = require('../../src/util/sync') as { SyncUtil: jest.Mock };

      require('../../src/core/experiment');

      expect(IsolatedSyncUtil).not.toHaveBeenCalled();
      expect(IsolatedKeyUtil).not.toHaveBeenCalled();
      expect(IsolatedUIUtil).not.toHaveBeenCalled();
    });
  });
});

describe('RunExperiment', () => {
  const initializeSpy = jest
    .spyOn(ExperimentApp.prototype, 'initialize')
    .mockImplementation(() => undefined);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    initializeSpy.mockRestore();
  });

  it('initializes its own app once with directly constructed utilities', () => {
    const syncUtil = {};
    syncUtilMock.mockReturnValue(syncUtil);
    const keyUtil = {};
    keyUtilMock.mockReturnValue(keyUtil);
    const uiUtil = {};
    uiUtilMock.mockReturnValue(uiUtil);

    RunExperiment();

    expect(syncUtilMock).toHaveBeenCalledTimes(1);
    expect(keyUtilMock).toHaveBeenCalledTimes(1);
    expect(keyUtilMock).toHaveBeenCalledWith(syncUtil);
    expect(uiUtilMock).toHaveBeenCalledTimes(1);
    expect(initializeSpy).toHaveBeenCalledTimes(1);
  });
});

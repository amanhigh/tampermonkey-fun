import { BarkatManager, IBarkatManager } from '../../src/manager/barkat';
import { IBarkatClient } from '../../src/client/barkat';
import { BarkatTickerAnalysis } from '../../src/models/barkat';

describe('BarkatManager', () => {
  let barkatManager: IBarkatManager;
  let mockBarkatClient: jest.Mocked<IBarkatClient>;

  // Validation belongs to the client; the manager only needs a typed payload.
  const analysis: BarkatTickerAnalysis = { ticker: 'BRK.B', timeframes: [] };

  beforeEach(() => {
    jest.clearAllMocks();

    mockBarkatClient = {
      getBaseUrl: jest.fn().mockReturnValue('http://localhost:8050/v1/api'),
      getTickerAnalysis: jest.fn(),
    } as unknown as jest.Mocked<IBarkatClient>;

    barkatManager = new BarkatManager(mockBarkatClient);
  });

  it('should pass the ticker through and return the client result unchanged', async () => {
    mockBarkatClient.getTickerAnalysis.mockResolvedValue(analysis);

    const result = await barkatManager.getTickerAnalysis('BRK.B');

    expect(mockBarkatClient.getTickerAnalysis).toHaveBeenCalledTimes(1);
    expect(mockBarkatClient.getTickerAnalysis).toHaveBeenCalledWith('BRK.B');
    expect(result).toBe(analysis);
  });

  it('should propagate client failures unchanged', async () => {
    const failure = new Error('Failed to get ticker analysis for BRK.B: 500');
    mockBarkatClient.getTickerAnalysis.mockRejectedValue(failure);

    await expect(barkatManager.getTickerAnalysis('BRK.B')).rejects.toBe(failure);
  });
});

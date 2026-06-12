import { IInvestingManager, InvestingManager } from '../../src/manager/investing';
import { IInstrumentClient } from '../../src/client/instrument';

describe('InvestingManager', () => {
  let manager: IInvestingManager;
  let mockInstrumentClient: jest.Mocked<IInstrumentClient>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockInstrumentClient = {
      getInstruments: jest.fn(),
      getBaseUrl: jest.fn(),
    } as any;

    manager = new InvestingManager(mockInstrumentClient);
  });

  describe('getInstrument', () => {
    it('should return instrument with matching href path', async () => {
      mockInstrumentClient.getInstruments.mockResolvedValue({
        quotes: [
          { id: 8874, url: '/indices/nq-100-futures', description: 'Nasdaq 100 Futures', symbol: 'NQM26', exchange: 'CME' },
          { id: 8849, url: '/commodities/crude-oil', description: 'Crude Oil WTI', symbol: 'CL', exchange: 'NYMEX' },
        ],
      });

      const result = await manager.getInstrument(
        'Nasdaq 100',
        'https://in.investing.com/indices/nq-100-futures'
      );

      expect(result).not.toBeNull();
      expect(result!.id).toBe(8874);
      expect(result!.description).toBe('Nasdaq 100 Futures');
    });

    it('should strip trailing slash from href path before matching', async () => {
      mockInstrumentClient.getInstruments.mockResolvedValue({
        quotes: [
          { id: 8849, url: '/commodities/crude-oil', description: 'Crude Oil WTI', symbol: 'CL', exchange: 'NYMEX' },
        ],
      });

      const result = await manager.getInstrument(
        'Crude Oil',
        'https://in.investing.com/commodities/crude-oil/'
      );

      expect(result).not.toBeNull();
      expect(result!.id).toBe(8849);
    });

    it('should return exact description match when no href', async () => {
      mockInstrumentClient.getInstruments.mockResolvedValue({
        quotes: [
          { id: 8849, url: '/commodities/crude-oil', description: 'Crude Oil WTI', symbol: 'CL', exchange: 'NYMEX' },
          { id: 8833, url: '/commodities/brent-oil', description: 'Brent Oil', symbol: 'LCO', exchange: 'ICE' },
        ],
      });

      const result = await manager.getInstrument('Crude Oil WTI');

      expect(result).not.toBeNull();
      expect(result!.id).toBe(8849);
    });

    it('should return exact description match case-insensitively', async () => {
      mockInstrumentClient.getInstruments.mockResolvedValue({
        quotes: [
          { id: 8874, url: '/indices/nq-100-futures', description: 'Nasdaq 100 Futures', symbol: 'NQM26', exchange: 'CME' },
        ],
      });

      const result = await manager.getInstrument('nasdaq 100 futures');

      expect(result).not.toBeNull();
      expect(result!.id).toBe(8874);
    });

    it('should return null when no quotes returned', async () => {
      mockInstrumentClient.getInstruments.mockResolvedValue({});

      const result = await manager.getInstrument('ZZZZZ');

      expect(result).toBeNull();
    });

    it('should return null when href path does not match any quote', async () => {
      mockInstrumentClient.getInstruments.mockResolvedValue({
        quotes: [
          { id: 8874, url: '/indices/nq-100-futures', description: 'Nasdaq 100 Futures', symbol: 'NQM26', exchange: 'CME' },
        ],
      });

      const result = await manager.getInstrument(
        'Nasdaq 100',
        'https://in.investing.com/indices/unknown'
      );

      expect(result).toBeNull();
    });

    it('should return null when name does not match any description', async () => {
      mockInstrumentClient.getInstruments.mockResolvedValue({
        quotes: [
          { id: 8874, url: '/indices/nq-100-futures', description: 'Nasdaq 100 Futures', symbol: 'NQM26', exchange: 'CME' },
        ],
      });

      const result = await manager.getInstrument('Unknown Instrument');

      expect(result).toBeNull();
    });

    it('should propagate client errors', async () => {
      mockInstrumentClient.getInstruments.mockRejectedValue(new Error('Network error'));

      await expect(manager.getInstrument('Nasdaq 100')).rejects.toThrow('Network error');
    });
  });
});

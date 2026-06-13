import { AlertClicked, AlertClickAction } from '../../src/models/events';

describe('AlertClicked', () => {
  describe('constructor', () => {
    it('should create event with alertTicker and action', () => {
      const event = new AlertClicked('INFY', AlertClickAction.OPEN);
      expect(event.alertTicker).toBe('INFY');
      expect(event.action).toBe(AlertClickAction.OPEN);
      expect(event.pairId).toBeUndefined();
      expect(event.alertName).toBeUndefined();
      expect(event.timestamp).toBeDefined();
    });

    it('should create event with pairId when provided', () => {
      const event = new AlertClicked('INFY', AlertClickAction.MAP, '12345');
      expect(event.alertTicker).toBe('INFY');
      expect(event.action).toBe(AlertClickAction.MAP);
      expect(event.pairId).toBe('12345');
      expect(event.alertName).toBeUndefined();
    });

    it('should create event with alertName when provided', () => {
      const event = new AlertClicked('INFY', AlertClickAction.MAP, '12345', 'Infosys Ltd');
      expect(event.alertTicker).toBe('INFY');
      expect(event.action).toBe(AlertClickAction.MAP);
      expect(event.pairId).toBe('12345');
      expect(event.alertName).toBe('Infosys Ltd');
    });
  });

  describe('stringify', () => {
    it('should serialize alertTicker, action, and optional fields', () => {
      const event = new AlertClicked('INFY', AlertClickAction.OPEN);
      const json = JSON.parse(event.stringify());
      expect(json.alertTicker).toBe('INFY');
      expect(json.action).toBe('OPEN');
      expect(json.pairId).toBeUndefined();
      expect(json.alertName).toBeUndefined();
    });

    it('should include alertName in serialization when set', () => {
      const event = new AlertClicked('NQ', AlertClickAction.MAP, '8874', 'Nasdaq 100 Futures');
      const json = JSON.parse(event.stringify());
      expect(json.alertTicker).toBe('NQ');
      expect(json.action).toBe('MAP');
      expect(json.pairId).toBe('8874');
      expect(json.alertName).toBe('Nasdaq 100 Futures');
    });
  });

  describe('fromString', () => {
    it('should deserialize alertTicker, action, pairId, and alertName', () => {
      const json = JSON.stringify({
        alertTicker: 'NQM26',
        action: 'MAP',
        pairId: '8874',
        alertName: 'Nasdaq 100 Futures',
      });
      const event = AlertClicked.fromString(json);
      expect(event.alertTicker).toBe('NQM26');
      expect(event.action).toBe(AlertClickAction.MAP);
      expect(event.pairId).toBe('8874');
      expect(event.alertName).toBe('Nasdaq 100 Futures');
    });

    it('should handle deserialization without pairId and alertName', () => {
      const json = JSON.stringify({ alertTicker: 'TCS', action: 'OPEN' });
      const event = AlertClicked.fromString(json);
      expect(event.alertTicker).toBe('TCS');
      expect(event.action).toBe(AlertClickAction.OPEN);
      expect(event.pairId).toBeUndefined();
      expect(event.alertName).toBeUndefined();
    });
  });
});

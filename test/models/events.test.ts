import { AlertClicked, AlertClickAction } from '../../src/models/events';

describe('AlertClicked', () => {
  describe('constructor', () => {
    it('should create event with alertTicker and action', () => {
      const event = new AlertClicked('INFY', AlertClickAction.OPEN);
      expect(event.alertTicker).toBe('INFY');
      expect(event.action).toBe(AlertClickAction.OPEN);
      expect(event.pairId).toBeUndefined();
      expect(event.timestamp).toBeDefined();
    });

    it('should create event with pairId when provided', () => {
      const event = new AlertClicked('INFY', AlertClickAction.MAP, '12345');
      expect(event.alertTicker).toBe('INFY');
      expect(event.action).toBe(AlertClickAction.MAP);
      expect(event.pairId).toBe('12345');
    });
  });

  describe('stringify', () => {
    it('should serialize alertTicker, action, and optional pairId', () => {
      const event = new AlertClicked('INFY', AlertClickAction.OPEN);
      const json = JSON.parse(event.stringify());
      expect(json.alertTicker).toBe('INFY');
      expect(json.action).toBe('OPEN');
      expect(json.pairId).toBeUndefined();
    });

    it('should include pairId in serialization when set', () => {
      const event = new AlertClicked('INFY', AlertClickAction.MAP, '12345');
      const json = JSON.parse(event.stringify());
      expect(json.alertTicker).toBe('INFY');
      expect(json.action).toBe('MAP');
      expect(json.pairId).toBe('12345');
    });
  });

  describe('fromString', () => {
    it('should deserialize alertTicker, action, and pairId', () => {
      const json = JSON.stringify({ alertTicker: 'HDFC', action: 'MAP', pairId: '67890' });
      const event = AlertClicked.fromString(json);
      expect(event.alertTicker).toBe('HDFC');
      expect(event.action).toBe(AlertClickAction.MAP);
      expect(event.pairId).toBe('67890');
    });

    it('should handle deserialization without pairId', () => {
      const json = JSON.stringify({ alertTicker: 'TCS', action: 'OPEN' });
      const event = AlertClicked.fromString(json);
      expect(event.alertTicker).toBe('TCS');
      expect(event.action).toBe(AlertClickAction.OPEN);
      expect(event.pairId).toBeUndefined();
    });

    it('should read alertTicker field (not legacy ticker)', () => {
      const json = JSON.stringify({ alertTicker: 'INFY', action: 'OPEN' });
      const event = AlertClicked.fromString(json);
      expect(event.alertTicker).toBe('INFY');
    });
  });
});

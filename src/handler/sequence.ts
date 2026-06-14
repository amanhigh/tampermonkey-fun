import { ISequenceManager } from '../manager/sequence';
import { IDomManager } from '../manager/dom';
import { ILifecycleManager } from '../manager/lifecycle';
import { IDisplayHandler } from './display';
import { Constants } from '../models/constant';
import { Notifier } from '../util/notify';

/**
 * Interface for sequence handling operations
 */
export interface ISequenceHandler {
  /**
   * Handles the sequence switch operation
   */
  handleSequenceSwitch(): Promise<void>;

  /**
   * Toggles sequence freeze state
   * Uses current sequence when enabling freeze
   */
  toggleFreezeSequence(): Promise<void>;

  /**
   * Starts tracking the current ticker by creating a backend record
   * using the current sequence's timeframes and DOM context.
   */
  startTracking(): Promise<void>;
}

/**
 * Handles sequence operations (switch, freeze, tracking).
 * Display area rendering is delegated to DisplayHandler.
 */
export class SequenceHandler implements ISequenceHandler {
  constructor(
    private readonly sequenceManager: ISequenceManager,
    private readonly domManager: IDomManager,
    private readonly lifecycleManager: ILifecycleManager,
    private readonly displayHandler: IDisplayHandler
  ) {}

  /** @inheritdoc */
  async handleSequenceSwitch(): Promise<void> {
    await this.sequenceManager.flipSequence();
    await this.displayHandler.display();
  }

  /** @inheritdoc */
  async toggleFreezeSequence(): Promise<void> {
    await this.sequenceManager.toggleFreezeSequence();
  }

  /** @inheritdoc */
  async startTracking(): Promise<void> {
    const ticker = this.domManager.getTicker();
    const exchange = this.domManager.getCurrentExchange();
    const sequence = await this.sequenceManager.getCurrentSequence();
    const timeframes = Constants.TIME.SEQUENCE_TYPES.TO_TIMEFRAMES[sequence];

    try {
      await this.lifecycleManager.startTracking({
        ticker,
        exchange,
        timeframes,
        type: 'EQUITY',
        state: 'WATCHED',
        trend: 'SIDEWAYS',
        last_opened_at: new Date().toISOString(),
      });
      Notifier.success(`⏺ Started tracking ${ticker}`);
    } catch (error) {
      Notifier.warn(`Failed to start tracking ${ticker}: ${(error as Error).message}`);
    }
  }
}

import '../style/seer.less';
import { IGlobalErrorHandler } from '../handler/error';
import { ISeerHandler } from '../handler/seer';
import { Factory } from './factory';

export class SeerApp {
  constructor(
    private readonly seerHandler: ISeerHandler,
    private readonly errorHandler: IGlobalErrorHandler
  ) {}

  public initialize(): void {
    // Register error handlers first
    this.errorHandler.registerGlobalErrorHandlers();
    this.seerHandler.initialize();
  }
}

export function RunSeer(): void {
  console.info('Seer started');
  const app = Factory.app.seer();
  app.initialize();
}

if (require.main?.id === module.id) {
  RunSeer();
}

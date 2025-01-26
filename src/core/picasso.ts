import { IGlobalErrorHandler } from '../handler/error';
import { IPicassoHandler } from '../handler/picasso';

export class PicassoApp {
  constructor(
    private readonly errorHandler: IGlobalErrorHandler,
    private readonly picassoHandler: IPicassoHandler
  ) {}

  public initialize(): void {
    this.errorHandler.registerGlobalErrorHandlers();
    this.picassoHandler.initialize();
  }
}

import { Factory } from './factory';

export function RunPicasso(): void {
  console.info('🎨 Picasso Drawing Accelerator Started');
  const app = Factory.app.picasso();
  app.initialize();
}

// RunPicasso();

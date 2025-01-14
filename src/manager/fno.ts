import { IFnoRepo } from '../repo/fno';

export interface IFnoManager {
  add(tickers: Set<string>): void;
  remove(tickers: Set<string>): void;
  clear(): void;
  getCount(): number;
}

export class FnoManager implements IFnoManager {
  constructor(private readonly fnoRepo: IFnoRepo) {}

  public add(tickers: Set<string>): void {
    tickers.forEach((ticker) => this.fnoRepo.add(ticker));
  }

  public remove(tickers: Set<string>): void {
    tickers.forEach((ticker) => this.fnoRepo.delete(ticker));
  }

  public clear(): void {
    this.fnoRepo.clear();
  }

  public getCount(): number {
    return this.fnoRepo.getCount();
  }
}

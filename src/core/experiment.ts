import '../style/main.less';
import { Factory } from './factory';
import { UIUtil } from '../util/ui';
import { IKeyUtil } from '../util/key';
import { Notifier } from '../util/notify';
import { RunPicasso } from './picasso';
import { RunBarkat } from './barkat';

interface TestComponents {
  input: JQuery;
  experimentButton: JQuery;
  messageArea: JQuery;
}

export class ExperimentApp {
  private readonly uiUtil: UIUtil;
  private readonly keyUtil: IKeyUtil;

  constructor(uiUtil: UIUtil, keyUtil: IKeyUtil) {
    this.uiUtil = uiUtil;
    this.keyUtil = keyUtil;
  }

  public initialize(): void {
    const components = this.setupUI();
    this.appendToBody(components);
    this.setupKeyboardEvents();
  }

  // Experiments
  private async runExperiment(): Promise<void> {
    await this.apiTest();
  }

  private handleKeyEvent(e: KeyboardEvent): void {
    if (e.key === 'n' && this.keyUtil.isDoubleKey(e)) {
      this.showMessage(`Double Key Detected: ${e.key}`);
    }
  }

  private async apiTest(): Promise<void> {
    try {
      const response = await this.makeRequest<unknown>({
        url: 'https://reqres.in/api/users?page=2',
        method: 'GET',
      });
      console.info(response);
      this.showMessage('API Successful');
    } catch (error) {
      console.error('API Error:', error);
      this.showMessage(`API Error: ${(error as Error).message}`);
    }
  }

  // Setup UI
  private setupUI(): TestComponents {
    return {
      input: this.uiUtil.buildInput('aman').css({
        'font-size': '18px',
        position: 'absolute',
        top: '100px',
        right: '40px',
      }),

      experimentButton: this.uiUtil
        .buildButton('experiment-btn', 'experiment', () => void this.runExperiment())
        .css({
          'font-size': '18px',
          position: 'absolute',
          top: '140px',
          right: '40px',
        }),

      messageArea: this.uiUtil.buildLabel('', 'black', 'msg').css({
        'font-size': '18px',
        position: 'absolute',
        top: '160px',
        right: '40px',
      }),
    };
  }

  private appendToBody(components: TestComponents): void {
    Object.values(components).forEach((component) => {
      document.body.appendChild(component[0]);
    });
  }

  // Helpers
  private setupKeyboardEvents(): void {
    document.addEventListener('keydown', this.handleKeyEvent.bind(this));
  }

  private async makeRequest<T>(details: Pick<GM.Request, 'url' | 'method'> & Partial<GM.Request>): Promise<T> {
    return new Promise((resolve, reject) => {
      GM.xmlHttpRequest({
        ...details, // Spread first to allow overrides
        headers: {
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Upgrade-Insecure-Requests': '1',
          'Cache-Control': 'max-age=0',
          ...details.headers,
        },
        onload: (response) => {
          if (response.status >= 200 && response.status < 400) {
            try {
              const data = JSON.parse(response.responseText);
              resolve(data);
            } catch (error) {
              reject(new Error(`Failed to parse response: ${(error as Error).message}`));
            }
          } else {
            reject(new Error(`${response.status} ${response.statusText}: ${response.responseText}`));
          }
        },
        onerror: (response) => reject(new Error(`Network error: ${response.statusText}`)),
      });
    });
  }

  private showMessage(text: string): void {
    Notifier.info(`${text} 🎉`);
  }
}

export function RunExperiment(): void {
  console.info('Tamperfun Experiment started');
  const app = Factory.app.test();
  app.initialize();
}

RunExperiment();
// RunBarkat();
// RunPicasso();

declare module 'node-fetch' {
  import fetch from 'node-fetch';
  export default fetch;
}

declare module '@anthropic-ai/sdk' {
  export default class Anthropic {
    constructor(options: any);
    messages: {
      create(options: any): Promise<any>;
    };
  }
}

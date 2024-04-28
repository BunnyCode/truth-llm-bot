// Class for making multiple calls to the GPT API
// before the response is returned.

class MultiCallGPT {
  constructor() {
    this.calls = [];
  }

  addCall(call) {
    this.calls.push(call);
  }

  async execute() {
    const responses = [];
    for (const call of this.calls) {
      responses.push(await call());
    }
    return responses;
  }
}

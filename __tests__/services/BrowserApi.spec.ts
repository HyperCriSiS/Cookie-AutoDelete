describe('BrowserApi action compatibility', () => {
  beforeEach(() => {
    jest.resetModules();
    delete global.browser.action;
  });

  afterEach(() => {
    delete global.browser.action;
  });

  it('uses browserAction on Manifest V2', () => {
    const { actionApi } = require('../../src/services/BrowserApi');
    expect(actionApi).toBe(global.browser.browserAction);
  });

  it('prefers action when Manifest V3 exposes it', () => {
    const mv3Action = { setTitle: jest.fn() };
    global.browser.action = mv3Action;

    const { actionApi } = require('../../src/services/BrowserApi');
    expect(actionApi).toBe(mv3Action);
  });
});

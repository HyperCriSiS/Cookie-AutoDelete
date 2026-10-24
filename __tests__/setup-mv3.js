/**
 * MV3 compatibility shims for the legacy Jest browser mock.
 * Production code uses MV3 APIs; this adapter lets the existing tests keep
 * their established tabs.executeScript fixtures until the test mock itself is
 * modernized.
 */

if (!global.browser.scripting) {
  global.browser.scripting = {
    executeScript: jest.fn(async () => {
      const frames = await global.browser.tabs.executeScript(undefined, {});
      return (frames || []).map((result) => ({ result }));
    }),
  };
}

if (!global.browser.alarms.onAlarm) {
  global.browser.alarms.onAlarm = {
    addListener: jest.fn(),
    hasListener: jest.fn(),
    removeListener: jest.fn(),
  };
}

/**
 * Copyright (c) 2017-2022 Kenny Do and CAD Team (https://github.com/Cookie-AutoDelete/Cookie-AutoDelete/graphs/contributors)
 * Licensed under MIT (https://github.com/Cookie-AutoDelete/Cookie-AutoDelete/blob/3.X.X-Branch/LICENSE)
 */

import { Store } from 'redux';
import { when } from 'jest-when';
import * as Actions from '../../src/redux/Actions';
import { initialState } from '../../src/redux/State';
import createStore from '../../src/redux/Store';
import AlarmEvents from '../../src/services/AlarmEvents';
import StoreUser from '../../src/services/StoreUser';
import { ReduxAction } from '../../src/typings/ReduxConstants';
import { updateSetting } from '../../src/redux/Actions';

jest.requireActual('../../src/redux/Actions');
const spyActions: JestSpyObject = global.generateSpies(Actions);

const store: Store<State, ReduxAction> = createStore(initialState);
StoreUser.init(store);

class TestStore extends StoreUser {
  public static changeSetting(
    name: SettingID,
    value: string | boolean | number,
  ) {
    StoreUser.store.dispatch(updateSetting({ name, value }));
  }
}

describe('AlarmEvents', () => {
  beforeEach(() => {
    spyActions.cookieCleanup.mockImplementation(() => () => undefined);
    TestStore.changeSetting(SettingID.ACTIVE_MODE, true);
    TestStore.changeSetting(SettingID.CLEAN_DELAY, 60);
    when(global.browser.alarms.get)
      .calledWith(AlarmEvents.ACTIVE_MODE_ALARM)
      .mockResolvedValue(undefined as never);
    when(global.browser.alarms.clear)
      .calledWith(AlarmEvents.ACTIVE_MODE_ALARM)
      .mockResolvedValue(true as never);
  });

  it('creates a real one-shot browser alarm', async () => {
    const before = Date.now();
    await AlarmEvents.createActiveModeAlarm();

    expect(global.browser.alarms.create).toHaveBeenCalledWith(
      AlarmEvents.ACTIVE_MODE_ALARM,
      expect.objectContaining({
        when: expect.any(Number),
      }),
    );
    const whenValue = global.browser.alarms.create.mock.calls[0][1].when;
    expect(whenValue).toBeGreaterThanOrEqual(before + 60 * 1000);
  });

  it('does not schedule a duplicate while an alarm already exists', async () => {
    when(global.browser.alarms.get)
      .calledWith(AlarmEvents.ACTIVE_MODE_ALARM)
      .mockResolvedValue({
        name: AlarmEvents.ACTIVE_MODE_ALARM,
        scheduledTime: Date.now() + 60 * 1000,
      } as never);

    await AlarmEvents.createActiveModeAlarm();

    expect(global.browser.alarms.create).not.toHaveBeenCalled();
  });

  it('runs cleanup when the persisted alarm fires', async () => {
    await AlarmEvents.onAlarm({
      name: AlarmEvents.ACTIVE_MODE_ALARM,
      scheduledTime: Date.now(),
    });

    expect(spyActions.cookieCleanup).toHaveBeenCalledWith({
      greyCleanup: false,
      ignoreOpenTabs: false,
    });
  });

  it('ignores unrelated alarms', async () => {
    await AlarmEvents.onAlarm({
      name: 'otherAlarm',
      scheduledTime: Date.now(),
    });

    expect(spyActions.cookieCleanup).not.toHaveBeenCalled();
  });

  it('does not clean after active mode was disabled', async () => {
    TestStore.changeSetting(SettingID.ACTIVE_MODE, false);

    await AlarmEvents.onAlarm({
      name: AlarmEvents.ACTIVE_MODE_ALARM,
      scheduledTime: Date.now(),
    });

    expect(spyActions.cookieCleanup).not.toHaveBeenCalled();
  });
});

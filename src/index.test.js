import nock from 'nock';

import { URL, AUTH_URL, getGatewayDevices, getToken, revokeTokens, patchGatewayDevice } from './index.js';

nock.disableNetConnect();
const daikinScope = nock(URL);
const daikinAuthScope = nock(AUTH_URL);

const secrets = {
  client_id: 'MOCKED_CLIENT_ID',
  client_secret: 'MOCKED_CLIENT_SECRET',
  redirect_uri: 'MOCKED_REDIRECT_URI',
};

const token = {
  token_type: 'MOCKED_TOKEN_TYPE',
  access_token: 'MOCKED_ACCESS_TOKEN',
  refresh_token: 'MOCKED_REFRESH_TOKEN',
};

const gatewayDevices = [{ id: 'MOCKED_DEVICE_ID' }];

describe('auth', () => {
  test('should get token from code', async () => {
    daikinAuthScope.post('/token?client_id=MOCKED_CLIENT_ID&client_secret=MOCKED_CLIENT_SECRET&redirect_uri=MOCKED_REDIRECT_URI&grant_type=authorization_code&code=MOCKED_CODE')
      .reply(200, token);

    const response = await getToken({ secrets, code: 'MOCKED_CODE' });

    expect(response.access_token).toBe(token.access_token);
  });

  test('should get token from refresh token', async () => {
    daikinAuthScope.post('/token?client_id=MOCKED_CLIENT_ID&client_secret=MOCKED_CLIENT_SECRET&redirect_uri=MOCKED_REDIRECT_URI&grant_type=refresh_token&refresh_token=MOCKED_REFRESH_TOKEN')
      .reply(200, token);

    const { refresh_token } = token;
    const response = await getToken({ secrets, refresh_token });

    expect(response.access_token).toBe(token.access_token);
  });

  test('should revoke tokens', async () => {
    daikinAuthScope.post('/revoke?client_id=MOCKED_CLIENT_ID&client_secret=MOCKED_CLIENT_SECRET&token=MOCKED_ACCESS_TOKEN&token_type_hint=access_token')
      .reply(200, { statusReason: 'OK' });
    daikinAuthScope.post('/revoke?client_id=MOCKED_CLIENT_ID&client_secret=MOCKED_CLIENT_SECRET&token=MOCKED_REFRESH_TOKEN&token_type_hint=refresh_token')
      .reply(200, { statusReason: 'OK' });

    const { access_token, refresh_token } = token;
    const results = await revokeTokens({ secrets, access_token, refresh_token });

    expect(results.length).toBe(2);
    for (const response of results) {
      expect((await response.json()).statusReason).toBe('OK');
    }
  });
});

describe('devices', () => {
  afterEach(() => {
    if (!nock.isDone()) {
      throw new Error(
        `Not all nock interceptors were used: ${JSON.stringify(nock.pendingMocks())}`,
      );
    }

    nock.cleanAll();
  });

  test('should get devices', async () => {
    daikinScope.get('/gateway-devices')
      .matchHeader('Authorization', 'MOCKED_TOKEN_TYPE MOCKED_ACCESS_TOKEN')
      .reply(200, gatewayDevices);

    const { status, data, refreshedToken } = await getGatewayDevices({ secrets, token });

    expect(status).toBe(200);
    expect(data).toEqual(gatewayDevices);
    expect(refreshedToken).toBe(false);
  });

  test('should get devices with refreshed token', async () => {
    daikinScope.get('/gateway-devices')
      .matchHeader('Authorization', 'MOCKED_TOKEN_TYPE MOCKED_ACCESS_TOKEN')
      .reply(401, { error: 'token_expired' });

    const newAccessToken = 'MOCKED_REFRESHED_ACCESS_TOKEN';
    daikinAuthScope.post('/token?client_id=MOCKED_CLIENT_ID&client_secret=MOCKED_CLIENT_SECRET&redirect_uri=MOCKED_REDIRECT_URI&grant_type=refresh_token&refresh_token=MOCKED_REFRESH_TOKEN')
      .reply(200, {
        ...token,
        access_token: newAccessToken,
      });

    daikinScope.get('/gateway-devices')
      .matchHeader('Authorization', `MOCKED_TOKEN_TYPE ${newAccessToken}`)
      .reply(200, [{ id: 'MOCKED_DEVICE_ID' }]);

    const { status, data, refreshedToken } = await getGatewayDevices({ secrets, token });

    expect(status).toBe(200);
    expect(data).toEqual(gatewayDevices);
    expect(refreshedToken.access_token).toBe(newAccessToken);
  });

  test('should patch device', async () => {
    const body = {
      path: '/operationModes/heating/setpoints/roomTemperature',
      value: 22,
    };
    daikinScope.patch(`/gateway-devices/MOCKED_DEVICE_ID/management-points/1/characteristics/temperatureControl`, body)
      .reply(204, null, { 'x-ratelimit-remaining-day': '1336' });

    const { status, refreshedToken } = await patchGatewayDevice({
      secrets,
      token,
      deviceId: 'MOCKED_DEVICE_ID',
      path: 'management-points/1/characteristics/temperatureControl',
      body,
    });

    expect(status).toBe(204);
    expect(refreshedToken).toBe(false);
  });
});

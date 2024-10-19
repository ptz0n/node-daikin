import qs from 'node:querystring';

import { truncateMiddle } from './utils.js';

export const URL = 'https://api.onecta.daikineurope.com/v1';
export const AUTH_URL = 'https://idp.onecta.daikineurope.com/v1/oidc';

export const buildUrl = (url, params) => (params ? `${url}?${qs.stringify(params)}` : url);

export const buildAuthUrl = ({ client_id, redirect_uri }) =>
  buildUrl(`${AUTH_URL}/authorize`, {
    client_id,
    redirect_uri,
    response_type: 'code',
    scope: 'openid onecta:basic.integration',
  });

export const getToken = async ({ secrets, code, refresh_token }) => {
  const { client_id, client_secret, redirect_uri } = secrets;

  const params = {
    client_id,
    client_secret,
    redirect_uri,
  };

  if (code) {
    params.grant_type = 'authorization_code';
    params.code = code;
  } else if (refresh_token) {
    params.grant_type = 'refresh_token';
    params.refresh_token = refresh_token;
  }

  const url = buildUrl(`${AUTH_URL}/token`, params);
  const res = await fetch(url, { method: 'POST', keepalive: true });
  const data = await res.json();

  if (res.status !== 200) {
    console.warn(data);
    throw {
      statusCode: res.status,
      ...data,
    };
  }

  return data;
};

export const revokeTokens = async ({ secrets, access_token, refresh_token }) => {
  const { client_id, client_secret } = secrets;

  const requests = [
    {
      token: access_token,
      token_type_hint: 'access_token',
    },
    {
      token: refresh_token,
      token_type_hint: 'refresh_token',
    },
  ];

  return Promise.all(requests
    .map((params) => fetch(
      buildUrl(`${AUTH_URL}/revoke`, {
        client_id,
        client_secret,
        ...params,
      }),
      { method: 'POST', keepalive: true }
    ))
  );
};

export const request = async (options, tokenRefreshed = false) => {
  const { secrets, url, token, method = 'GET', body } = options;
  const { token_type, access_token, refresh_token } = token;

  const req = {
    method,
    headers: {
      Authorization: `${token_type} ${access_token}`,
    },
    keepalive: true,
  };

  if (body) {
    req.headers['Content-Type'] = 'application/json';
    req.body = JSON.stringify(body);
  }

  const res = await fetch(url, req);

  const rateLimitRemainingDay = res.headers.get('x-ratelimit-remaining-day');
  rateLimitRemainingDay && console.log(JSON.stringify({
    'x-ratelimit-remaining-day': rateLimitRemainingDay,
  }));

  const data = res.status === 204 ? {} : await res.json();

  if (res.status === 401 && token) {
    const timeRef = `refreshing token (${truncateMiddle(refresh_token, 21)})`;
    console.time(timeRef);
    const refreshedToken = await getToken({ secrets, refresh_token });
    console.timeEnd(timeRef);
    return request({ ...options, token: refreshedToken }, true);
  }

  if (res.status > 299) {
    console.warn(data);
    throw {
      statusCode: res.status,
      ...data,
    };
  }

  return {
    status: res.status,
    data,
    refreshedToken: tokenRefreshed && token,
  };
};

export const getUserInfo = (options) => request({
  url: 'https://cdc.daikin.eu/oidc/op/v1.0/3_xRB3jaQ62bVjqXU1omaEsPDVYC0Twi1zfq1zHPu_5HFT0zWkDvZJS97Yw1loJnTm/userinfo',
  ...options,
});

export const getSites = (options) => request({ url: `${URL}/sites`, ...options });

export const getGatewayDevices = (options) => request({ url: `${URL}/gateway-devices`, ...options });

export const patchGatewayDevice = ({ deviceId, path, ...options }) => request({
  url: `${URL}/gateway-devices/${deviceId}/${path}`,
  method: 'PATCH',
  ...options,
});

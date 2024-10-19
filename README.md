# daikin-onecta

This zero-dependency Node.js module integrates with the Daikin Onecta API for controlling internet-connected heat pumps. It handles OAuth2 authentication, token refreshing, and provides access to key API features like retrieving user info, managing sites, and controlling gateway devices, with automatic token refresh for seamless API access.

Official docs: https://developer.cloud.daikineurope.com/

## Legal Disclaimer

This software is not affiliated with Daikin Europe N.V. and the developers take no legal responsibility for the functionality or security of your devices.

## Installation

```bash
$ npm install daikin-onecta --save
```

## Usage

```javascript
import { getToken } from 'daikin-onecta';

const secrets = {
  client_id: 'YOUR_CLIENT_ID',
  client_secret: 'YOUR_CLIENT_SECRET',
  redirect_uri: 'YOUR_REDIRECT_URI',
};

const token = await getToken({ secrets, code: 'GENERATED_AUTH_CODE' });

const { data, refreshedToken } = await getGatewayDevices({ secrets, token });

console.log(data);
```

```json
[
  {
    "_id": "c07294f3-1202-41dd-a139-f5a466e6264e",
    "deviceModel": "Altherma",
    "embeddedId": "29300444-4258-4938-84aa-0296c100e13f",
    "id": "c07294f3-1202-41dd-a139-f5a466e6264e",
    "type": "heating",
    "isCloudConnectionUp": {
      "value": true,
      "settable": false
    },
    "timestamp": "2024-10-13T20:20:39.000Z",
    "managementPoints": […]
  }
]
```

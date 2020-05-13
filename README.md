# mongodb-cloud-info
Get cloud information based on hostname.

## Usage

Pass a service hostname to the `getCloudInfo()` function to get cloud information.

```js
import get from 'lodash.get';
import { getCloudInfo } from 'mongodb-cloud-info';

async function getCloudInfoFromDataService(dataService) {
  try {
    const firstServerHostname = get(dataService, 'client.model.hosts.0.host');
    
    return await getCloudInfo(firstServerHostname);
  } catch (e) {
    return {};
  }
}
```

## The return object

```js
{
  isAws: false,
  isGcp: false,
  isAzure: false
}
```

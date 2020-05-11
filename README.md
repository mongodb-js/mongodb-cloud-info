# mongodb-cloud-info
Get cloud information based on hostname.

## Usage

Pass a service hostname to the `getCloudInfo()` function to get cloud information.

```
async function getCloudInfoFromDataService(dataService) {
  try {
    const firstServerHostname = lodashGet(dataService, 'client.model.hosts.0.host');
    return await getCloudInfo(firstServerHostname);
  } catch (e) {
    return {};
  }
}
```

## The return object

```
{
  isAws: false,
  isGcp: false,
  isAzure: false
}
```
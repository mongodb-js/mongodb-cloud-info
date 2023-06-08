const util = require('util');
const dns = require('dns');
const zlib = require('zlib');
const net = require('net');
const ipaddr = require('ipaddr.js');
const fetch = require('cross-fetch');
const gceIps = require('gce-ips');

const dnsLookup = util.promisify(dns.lookup.bind(dns));
const gunzip = util.promisify(zlib.gunzip);

async function getGCPIpRanges() {
  const gceIpsInstance = gceIps();
  const lookup = util.promisify(gceIpsInstance.lookup.bind(gceIpsInstance));

  return await lookup();
}

async function getAwsIpRanges() {
  const awsIpRangesUrl = 'https://ip-ranges.amazonaws.com/ip-ranges.json';
  const { prefixes } = await fetch(awsIpRangesUrl, { timeout: 3000 }).then(res => res.json());

  return prefixes
    .map((range) => range.ip_prefix);
}

let azureServiceTagsPublic;
async function getAzureIpRanges() {
  if (!azureServiceTagsPublic) {
    const compressed = require('./ServiceTags_Public_20191202.compressed.js');
    azureServiceTagsPublic = JSON.parse(await gunzip(Buffer.from(compressed, 'base64')));
  }

  return azureServiceTagsPublic
    .values
    .map(value => value.properties.addressPrefixes)
    .reduce((acc, val) => acc.concat(val), []);
}

function rangeContainsIp(ipRanges, ip) {
  const address = ipaddr.parse(ip);
  return !!ipRanges.find((ipRange) => {
    const cidr = ipaddr.parseCIDR(ipRange);
    if (address.kind() !== cidr[0].kind()) {
      // cannot match ipv4 address with non-ipv4 one
      return false;
    }
    return address.match(cidr);
  });
}

async function getCloudInfo(host) {
  if (!host) {
    return {
      isAws: false,
      isGcp: false,
      isAzure: false
    };
  }

  const ip = await dnsLookup(host);
  const [gcpIpRanges, awsIpRanges, azureIpRanges] = (await Promise.all([
    getGCPIpRanges(),
    getAwsIpRanges(),
    getAzureIpRanges()
  ]));

  return {
    isAws: rangeContainsIp(awsIpRanges, ip),
    isGcp: rangeContainsIp(gcpIpRanges, ip),
    isAzure: rangeContainsIp(azureIpRanges, ip)
  };
}

module.exports = { getCloudInfo };

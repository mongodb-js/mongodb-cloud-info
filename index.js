const util = require('util');
const dns = require('dns');
const zlib = require('zlib');
const net = require('net');

const fetch = require('cross-fetch');
const { Netmask } = require('netmask');
const gceIps = require('gce-ips');

const dnsLookup = util.promisify(dns.lookup.bind(dns));
const gunzip = util.promisify(zlib.gunzip);

function isIpv4Range(range) {
  return net.isIPv4(range.split('/')[0]);
}

async function getGCPIpRanges() {
  const gceIpsInstance = gceIps();
  const lookup = util.promisify(gceIpsInstance.lookup.bind(gceIpsInstance));

  return (await lookup())
    .filter(isIpv4Range);
}

async function getAwsIpRanges() {
  const awsIpRangesUrl = 'https://ip-ranges.amazonaws.com/ip-ranges.json';
  const { prefixes } = await fetch(awsIpRangesUrl, { timeout: 3000 }).then(res => res.json());

  return prefixes
    .map((range) => range.ip_prefix)
    .filter(isIpv4Range);
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
    .reduce((acc, val) => acc.concat(val), [])
    .filter(isIpv4Range);
}

function rangeContainsIp(ipRanges, ip) {
  return !!ipRanges.find((cidr) => new Netmask(cidr).contains(ip));
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

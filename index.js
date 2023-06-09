const util = require('util');
const dns = require('dns');
const ipaddr = require('ipaddr.js');
const fetch = require('cross-fetch');

const CIDRS_URL = 'https://raw.githubusercontent.com/mongodb-js/mongodb-cloud-info/main/cidrs.json';

const dnsLookup = util.promisify(dns.lookup.bind(dns));

function parseAllIpRanges(ipRanges) {
  const parsed = {};
  for (const [name, { v4, v6 }] of Object.entries(ipRanges)) {
    parsed[name] = {
      v4: v4.map((cidr) => [new ipaddr.IPv4(cidr[0]), cidr[1]]),
      v6: v6.map((cidr) => [new ipaddr.IPv6(cidr[0]), cidr[1]])
    };
  }
  return parsed;
}

function rangesContainsIP(ipRanges, ip) {
  if (ip.kind() === 'ipv4') {
    return !!ipRanges.v4.find((cidr) => ip.match(cidr));
  }

  return !!ipRanges.v6.find((cidr) => ip.match(cidr));
}

async function getCloudInfo(host) {
  if (!host) {
    return {
      isAws: false,
      isGcp: false,
      isAzure: false
    };
  }

  const address = await dnsLookup(host);
  const ip = ipaddr.parse(address);

  const unparsedCIDRs = await fetch(CIDRS_URL, { timeout: 5000 }).then(res => res.json());
  const cidrs = parseAllIpRanges(unparsedCIDRs);

  return {
    isAws: rangesContainsIP(cidrs.aws, ip),
    isGcp: rangesContainsIP(cidrs.gcp, ip),
    isAzure: rangesContainsIP(cidrs.azure, ip)
  };
}

module.exports = { getCloudInfo };

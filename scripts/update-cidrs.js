#!/usr/bin/env node
const path = require('path');
const util = require('util');
const fs = require('fs');
const ipaddr = require('ipaddr.js');
const fetch = require('cross-fetch');
const gceIps = require('gce-ips');
const cheerio = require('cheerio');

const AWS_IP_RANGES_URL = 'https://ip-ranges.amazonaws.com/ip-ranges.json';
const SERVICE_TAG_LINK_HTML_PAGE_URL = 'https://www.microsoft.com/en-us/download/details.aspx?id=56519';

const FETCH_TIMEOUT = 10000;

function serializeV4CIDR(cidr) {
  // cidr is a two-element array. The first element is the address, the second
  // element is the part after /.
  // We can reconstruct the address with new ipaddr.IPv4(cidr[0].octets)
  return [cidr[0].octets, cidr[1]];
}

function serializeV6CIDR(cidr) {
  // cidr is a two-element array. The first element is the address, the second
  // element is the part after /.
  // We can reconstruct the address with new ipaddr.IPv6(cidr[0].parts).
  return [cidr[0].parts, cidr[1]];
}

async function getSplitGCPIpRanges() {
  const gceIpsInstance = gceIps();
  const lookup = util.promisify(gceIpsInstance.lookup.bind(gceIpsInstance));

  const prefixes = (await lookup()).sort();

  const v4 = [];
  const v6 = [];

  for (const prefix of prefixes) {
    const cidr = ipaddr.parseCIDR(prefix);
    if (cidr[0].kind() === 'ipv4') {
      v4.push(serializeV4CIDR(cidr));
    } else {
      v6.push(serializeV6CIDR(cidr));
    }
  }

  return {
    v4,
    v6
  };
}

async function getSplitAWSIpRanges() {
  const result = await fetch(AWS_IP_RANGES_URL, { timeout: FETCH_TIMEOUT }).then(res => res.json());

  return {
    v4: result.prefixes.map((range) => serializeV4CIDR(ipaddr.parseCIDR(range.ip_prefix))),
    v6: result.ipv6_prefixes.map((range) => serializeV6CIDR(ipaddr.parseCIDR(range.ipv6_prefix)))
  };
}

async function findServiceTagsPublicJsonUrl() {
  const url = SERVICE_TAG_LINK_HTML_PAGE_URL;

  const response = await fetch(url);
  const body = await response.text();
  const $ = cheerio.load(body);
  const link = $('a').filter(function() {
    return $(this).attr('href').match(/ServiceTags_Public_[\d]+\.json$/);
  }).first().attr('href');

  if (link) {
    return link;
  }

  throw new Error('Service tags link not found');
}

async function getSplitAzureIpRanges() {
  const azureIpRangesUrl = await findServiceTagsPublicJsonUrl();

  const { values } = await fetch(azureIpRangesUrl, { timeout: FETCH_TIMEOUT }).then(res => res.json());

  const v4 = [];
  const v6 = [];

  for (const value of values) {
    for (const addressPrefix of value.properties.addressPrefixes) {
      const cidr = ipaddr.parseCIDR(addressPrefix);
      if (cidr[0].kind() === 'ipv4') {
        v4.push(serializeV4CIDR(cidr));
      } else {
        v6.push(serializeV6CIDR(cidr));
      }
    }
  }

  return { v4, v6 };
}

async function writeAllIpRanges() {
  const [gcp, aws, azure] = (await Promise.all([
    getSplitGCPIpRanges(),
    getSplitAWSIpRanges(),
    getSplitAzureIpRanges()
  ]));

  const doc = {
    aws, azure, gcp
  };

  const filename = path.resolve(__dirname, '../', 'cidrs.json');
  await fs.promises.writeFile(filename, JSON.stringify(doc), 'utf8');
}

writeAllIpRanges()
  .catch((err) => {
    throw err;
  });

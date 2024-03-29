const getCloudInfo = require('../.').getCloudInfo;
const chai = require('chai');
const nock = require('nock');
const path = require('path');

const expect = chai.expect;

describe('getCloudInfo', () => {
  beforeEach(() => {
    nock('https://raw.githubusercontent.com')
      .get('/mongodb-js/mongodb-cloud-info/main/cidrs.json')
      .replyWithFile(200, path.resolve(__dirname, '../', 'cidrs.json'));
  });

  afterEach(() => {
    nock.cleanAll();
  });

  it('returns all false for undefined', async() => {
    const cloudInfo = await getCloudInfo();
    expect(cloudInfo).to.deep.equal({
      isAws: false,
      isGcp: false,
      isAzure: false
    });
  });


  it('returns all false for localhost', async() => {
    const cloudInfo = await getCloudInfo('localhost');
    expect(cloudInfo).to.deep.equal({
      isAws: false,
      isGcp: false,
      isAzure: false
    });
  });

  it('works with local ip address (127.0.0.1)', async() => {
    const cloudInfo = await getCloudInfo('127.0.0.1');
    expect(cloudInfo).to.deep.equal({
      isAws: false,
      isGcp: false,
      isAzure: false
    });
  });

  it('works with local ipv6 address (::1)', async() => {
    const cloudInfo = await getCloudInfo('::1');
    expect(cloudInfo).to.deep.equal({
      isAws: false,
      isGcp: false,
      isAzure: false
    });
  });

  it('returns {isAws: true} if hostname is an AWS ip', async() => {
    const cloudInfo = await getCloudInfo('13.248.118.1');
    expect(cloudInfo).to.deep.equal({
      isAws: true,
      isGcp: false,
      isAzure: false
    });
  });

  it('returns {isGcp: true} if hostname is a GCP ip', async() => {
    const cloudInfo = await getCloudInfo('8.34.208.1');
    expect(cloudInfo).to.deep.equal({
      isAws: false,
      isGcp: true,
      isAzure: false
    });
  });

  it('returns {isAzure: true} if hostname is an Azure ip', async() => {
    const cloudInfo = await getCloudInfo('13.64.151.161');
    expect(cloudInfo).to.deep.equal({
      isAws: false,
      isGcp: false,
      isAzure: true
    });
  });
}).timeout(5000);


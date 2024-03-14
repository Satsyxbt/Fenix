import { deployProxy, getDeploysData } from './utils';

async function main() {
  console.log('3_deploy_proxies.ts -- started');
  console.log('3_deploy_proxies.ts -- start deploy');

  let data = getDeploysData();

  if (data['ProxyAdmin']) {
    let ProxyAdmin = data['ProxyAdmin'];

    console.log('3_deploy_proxies.ts -- start deploy core part');
    await deployProxy(ProxyAdmin, data['MinterImplementation'], 'Minter');
    await deployProxy(ProxyAdmin, data['VeArtProxyImplementation'], 'VeArtProxy');
    await deployProxy(ProxyAdmin, data['VotingEscrowImplementation'], 'VotingEscrow');
    await deployProxy(ProxyAdmin, data['VoterImplementation'], 'Voter');

    console.log('3_deploy_proxies.ts -- start deploy additional part');
    await deployProxy(ProxyAdmin, data['VeFnxDistributorImplementation'], 'VeFnxDistributor');

    console.log('3_deploy_proxies.ts -- start deploy bribes part');

    await deployProxy(ProxyAdmin, data['BribeFactoryImplementation'], 'BribeFactory');

    console.log('3_deploy_proxies.ts -- start deploy gauge part');
    await deployProxy(ProxyAdmin, data['GaugeFactoryImplementation'], 'GaugeFactoryType');
    await deployProxy(ProxyAdmin, data['GaugeFactoryImplementation'], 'GaugeFactoryType2');
    await deployProxy(ProxyAdmin, data['GaugeFactoryImplementation'], 'GaugeFactoryType3');

    console.log('3_deploy_proxies.ts -- start deploy dex V2 part');
    await deployProxy(ProxyAdmin, data['PairFactoryImplementation'], 'PairFactory');

    console.log('3_deploy_proxies.ts -- success finished');
  } else {
    console.warn('3_deploy_proxies -- ProxyAdmin not found/deployed');
    console.log('3_deploy_proxies -- failed');
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

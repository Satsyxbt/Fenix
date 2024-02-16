import { deployProxy, getDeploysData } from '../utils';

async function main() {
  let data = getDeploysData();
  if (data['VoterImplementation'] && data['ProxyAdmin']) {
    await deployProxy(data['ProxyAdmin'], data['VoterImplementation'], 'Voter');
  } else {
    console.warn('Nessesary contract address not present');
  }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

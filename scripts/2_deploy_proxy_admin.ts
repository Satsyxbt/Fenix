import { deployBase } from './utils';

async function main() {
  console.log('2_deploy_proxy_admin.ts -- started');
  console.log('2_deploy_proxy_admin.ts -- start deploy');

  await deployBase('ProxyAdmin', 'ProxyAdmin');

  console.log('2_deploy_proxy_admin -- success finished');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

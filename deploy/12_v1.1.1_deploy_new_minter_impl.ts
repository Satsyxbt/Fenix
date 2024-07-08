import { deployBase } from './utils';

async function main() {
  await deployBase('MinterUpgradeable', 'MinterImplementation');
}
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

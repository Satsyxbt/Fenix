import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import completeFixture from './utils/coreFixture';

describe('Main', function () {
  it('deployed', async () => {
    const result = await loadFixture(completeFixture);

    result;
  });
});

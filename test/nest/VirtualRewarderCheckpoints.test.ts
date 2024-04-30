import { expect } from 'chai';
import { ethers } from 'hardhat';
import { VirtualRewarderCheckpointsMock } from '../../typechain-types';

describe('VirtualRewarderCheckpointsMock Contract', function () {
  let rewarderCheckpoints: VirtualRewarderCheckpointsMock;
  let lastIndex = BigInt(0);

  before(async () => {
    rewarderCheckpoints = await ethers.deployContract('VirtualRewarderCheckpointsMock');
  });

  it('return zero if not exist checkpoints', async () => {
    expect(await rewarderCheckpoints.checkpoints(0)).to.be.deep.eq([0, 0]);
    expect(await rewarderCheckpoints.getCheckpointIndex(0, 0)).to.be.eq(0);
    expect(await rewarderCheckpoints.getCheckpointIndex(0, 10)).to.be.eq(0);
    expect(await rewarderCheckpoints.getCheckpointIndex(0, 100)).to.be.eq(0);
  });

  describe('write first checkpoint', async () => {
    it('write checkpoint', async () => {
      let newLastIndex = await rewarderCheckpoints.writeCheckpoint.staticCall(0, 33, 2);
      await rewarderCheckpoints.writeCheckpoint(0, 33, 2);
      expect(newLastIndex).to.be.eq(1);
      lastIndex = newLastIndex;
    });

    it('newLastIndex', async () => {
      expect(lastIndex).to.be.eq(BigInt(1));
    });

    it(`not effect on previus checkpoint`, async () => {
      expect(await rewarderCheckpoints.checkpoints(0)).to.be.deep.eq([0, 0]);
      expect(await rewarderCheckpoints.checkpoints(2)).to.be.deep.eq([0, 0]);
    });

    it(`correct set new checkpoint`, async () => {
      expect(await rewarderCheckpoints.checkpoints(1)).to.be.deep.eq([33, 2]);
    });

    it(`getCheckpointIndex from 0 - 32 timestamp`, async () => {
      expect(await rewarderCheckpoints.getCheckpointIndex(1, 0)).to.be.eq(0);
      expect(await rewarderCheckpoints.getCheckpointIndex(1, 1)).to.be.eq(0);
      expect(await rewarderCheckpoints.getCheckpointIndex(1, 5)).to.be.eq(0);
      expect(await rewarderCheckpoints.getCheckpointIndex(1, 20)).to.be.eq(0);
      expect(await rewarderCheckpoints.getCheckpointIndex(1, 31)).to.be.eq(0);
      expect(await rewarderCheckpoints.getCheckpointIndex(1, 32)).to.be.eq(0);
    });

    it(`getCheckpointIndex for 32 timestamp`, async () => {
      expect(await rewarderCheckpoints.getCheckpointIndex(1, 33)).to.be.eq(1);
    });

    it(`getCheckpointIndex for 33..+  timestamp`, async () => {
      expect(await rewarderCheckpoints.getCheckpointIndex(1, 34)).to.be.eq(1);
      expect(await rewarderCheckpoints.getCheckpointIndex(1, 50)).to.be.eq(1);
      expect(await rewarderCheckpoints.getCheckpointIndex(1, 100000)).to.be.eq(1);
    });
  });

  describe('rewrite first checkpoint with new amount', async () => {
    it('write checkpoint', async () => {
      let newLastIndex = await rewarderCheckpoints.writeCheckpoint.staticCall(1, 33, 5);
      await rewarderCheckpoints.writeCheckpoint(1, 33, 5);
      expect(newLastIndex).to.be.eq(1);
      lastIndex = newLastIndex;
    });

    it(`not effect on previus checkpoint`, async () => {
      expect(await rewarderCheckpoints.checkpoints(0)).to.be.deep.eq([0, 0]);
      expect(await rewarderCheckpoints.checkpoints(2)).to.be.deep.eq([0, 0]);
    });

    it(`correct set new checkpoint`, async () => {
      expect(await rewarderCheckpoints.checkpoints(1)).to.be.deep.eq([33, 5]);
    });

    it(`getCheckpointIndex from 0 - 32 timestamp`, async () => {
      expect(await rewarderCheckpoints.getCheckpointIndex(1, 0)).to.be.eq(0);
      expect(await rewarderCheckpoints.getCheckpointIndex(1, 1)).to.be.eq(0);
      expect(await rewarderCheckpoints.getCheckpointIndex(1, 5)).to.be.eq(0);
      expect(await rewarderCheckpoints.getCheckpointIndex(1, 20)).to.be.eq(0);
      expect(await rewarderCheckpoints.getCheckpointIndex(1, 31)).to.be.eq(0);
      expect(await rewarderCheckpoints.getCheckpointIndex(1, 32)).to.be.eq(0);
    });
    it(`getCheckpointIndex for 32 timestamp`, async () => {
      expect(await rewarderCheckpoints.getCheckpointIndex(1, 33)).to.be.eq(1);
    });
    it(`getCheckpointIndex for 33..+  timestamp`, async () => {
      expect(await rewarderCheckpoints.getCheckpointIndex(1, 34)).to.be.eq(1);
      expect(await rewarderCheckpoints.getCheckpointIndex(1, 50)).to.be.eq(1);
      expect(await rewarderCheckpoints.getCheckpointIndex(1, 100000)).to.be.eq(1);
    });
  });

  describe('create second checkpoint in 500 timestamp nad new balance 1e18', async () => {
    it('write checkpoint', async () => {
      let newLastIndex = await rewarderCheckpoints.writeCheckpoint.staticCall(1, 500, ethers.parseEther('1'));
      await rewarderCheckpoints.writeCheckpoint(1, 500, ethers.parseEther('1'));
      expect(newLastIndex).to.be.eq(2);
      lastIndex = newLastIndex;
    });

    it(`not effect on previus checkpoint`, async () => {
      expect(await rewarderCheckpoints.checkpoints(0)).to.be.deep.eq([0, 0]);
      expect(await rewarderCheckpoints.checkpoints(1)).to.be.deep.eq([33, 5]);
      expect(await rewarderCheckpoints.checkpoints(3)).to.be.deep.eq([0, 0]);
    });

    it(`correct set new checkpoint`, async () => {
      expect(await rewarderCheckpoints.checkpoints(2)).to.be.deep.eq([500, ethers.parseEther('1')]);
    });

    it(`getCheckpointIndex from 0 - 32 timestamp`, async () => {
      expect(await rewarderCheckpoints.getCheckpointIndex(2, 0)).to.be.eq(0);
      expect(await rewarderCheckpoints.getCheckpointIndex(2, 32)).to.be.eq(0);
    });
    it(`getCheckpointIndex for 32 timestamp`, async () => {
      expect(await rewarderCheckpoints.getCheckpointIndex(2, 33)).to.be.eq(1);
    });
    it(`getCheckpointIndex for 33..499  timestamp`, async () => {
      expect(await rewarderCheckpoints.getCheckpointIndex(2, 34)).to.be.eq(1);
      expect(await rewarderCheckpoints.getCheckpointIndex(2, 50)).to.be.eq(1);
      expect(await rewarderCheckpoints.getCheckpointIndex(2, 499)).to.be.eq(1);
    });
    it(`getCheckpointIndex for 500 timestamp`, async () => {
      expect(await rewarderCheckpoints.getCheckpointIndex(2, 500)).to.be.eq(2);
    });
    it(`getCheckpointIndex for 501..+  timestamp`, async () => {
      expect(await rewarderCheckpoints.getCheckpointIndex(2, 501)).to.be.eq(2);
      expect(await rewarderCheckpoints.getCheckpointIndex(2, 1000)).to.be.eq(2);
      expect(await rewarderCheckpoints.getCheckpointIndex(2, 100000)).to.be.eq(2);
    });
  });

  describe('#1 Binary search functionality of getCheckpointIndex', function () {
    before(async () => {
      rewarderCheckpoints = await ethers.deployContract('VirtualRewarderCheckpointsMock');

      // Assuming the rewarderCheckpoints has been instantiated already.
      await rewarderCheckpoints.writeCheckpoint(0, 100, 10);
      await rewarderCheckpoints.writeCheckpoint(1, 200, 20);
      await rewarderCheckpoints.writeCheckpoint(2, 300, 30);
      await rewarderCheckpoints.writeCheckpoint(3, 400, 40);
      await rewarderCheckpoints.writeCheckpoint(4, 500, 50);
      lastIndex = BigInt(5); // Update lastIndex to the latest index after all writes.
    });

    it('should return index 0 for timestamps before the first checkpoint', async () => {
      expect(await rewarderCheckpoints.getCheckpointIndex(lastIndex, 50)).to.equal(0);
    });

    it('should return the exact index for timestamps matching existing checkpoints', async () => {
      expect(await rewarderCheckpoints.getCheckpointIndex(lastIndex, 99)).to.equal(0);
      expect(await rewarderCheckpoints.getCheckpointIndex(lastIndex, 100)).to.equal(1);
      expect(await rewarderCheckpoints.getCheckpointIndex(lastIndex, 200)).to.equal(2);
      expect(await rewarderCheckpoints.getCheckpointIndex(lastIndex, 300)).to.equal(3);
      expect(await rewarderCheckpoints.getCheckpointIndex(lastIndex, 400)).to.equal(4);
      expect(await rewarderCheckpoints.getCheckpointIndex(lastIndex, 500)).to.equal(5);
    });

    it('should return the nearest lower index for timestamps between checkpoints', async () => {
      expect(await rewarderCheckpoints.getCheckpointIndex(lastIndex, 150)).to.equal(1);
      expect(await rewarderCheckpoints.getCheckpointIndex(lastIndex, 250)).to.equal(2);
      expect(await rewarderCheckpoints.getCheckpointIndex(lastIndex, 350)).to.equal(3);
      expect(await rewarderCheckpoints.getCheckpointIndex(lastIndex, 450)).to.equal(4);
      expect(await rewarderCheckpoints.getCheckpointIndex(lastIndex, 550)).to.equal(5);
    });

    it('should return the last index for timestamps beyond the last checkpoint', async () => {
      expect(await rewarderCheckpoints.getCheckpointIndex(lastIndex, 600)).to.equal(5);
      expect(await rewarderCheckpoints.getCheckpointIndex(lastIndex, 1000)).to.equal(5);
      expect(await rewarderCheckpoints.getCheckpointIndex(lastIndex, 10000)).to.equal(5);
    });
  });
  describe('#2 Binary search functionality of getCheckpointIndex', function () {
    before(async () => {
      rewarderCheckpoints = await ethers.deployContract('VirtualRewarderCheckpointsMock');

      // Assuming the rewarderCheckpoints has been instantiated already.
      await rewarderCheckpoints.writeCheckpoint(0, 1, 10);
      await rewarderCheckpoints.writeCheckpoint(1, 2, 20);
      await rewarderCheckpoints.writeCheckpoint(2, 3, 30);
      await rewarderCheckpoints.writeCheckpoint(3, 4, 40);
      await rewarderCheckpoints.writeCheckpoint(4, 5, 50);
      lastIndex = BigInt(5); // Update lastIndex to the latest index after all writes.
    });

    it('should return index 0 for timestamps before the first checkpoint', async () => {
      expect(await rewarderCheckpoints.getCheckpointIndex(lastIndex, 0)).to.equal(0);
    });

    it('should return the exact index for timestamps matching existing checkpoints', async () => {
      for (let i = 1; i <= 5; i++) {
        expect(await rewarderCheckpoints.getCheckpointIndex(lastIndex, i)).to.equal(i);
      }
    });

    it('should return the nearest lower index for timestamps between checkpoints', async () => {
      expect(await rewarderCheckpoints.getCheckpointIndex(lastIndex, 0)).to.equal(0);
      expect(await rewarderCheckpoints.getCheckpointIndex(lastIndex, 1)).to.equal(1);
      expect(await rewarderCheckpoints.getCheckpointIndex(lastIndex, 2)).to.equal(2);
      expect(await rewarderCheckpoints.getCheckpointIndex(lastIndex, 3)).to.equal(3);
      expect(await rewarderCheckpoints.getCheckpointIndex(lastIndex, 4)).to.equal(4);
      expect(await rewarderCheckpoints.getCheckpointIndex(lastIndex, 5)).to.equal(5);
    });

    it('should return the last index for timestamps beyond the last checkpoint', async () => {
      expect(await rewarderCheckpoints.getCheckpointIndex(lastIndex, 6)).to.equal(5);
      expect(await rewarderCheckpoints.getCheckpointIndex(lastIndex, 10)).to.equal(5);
      expect(await rewarderCheckpoints.getCheckpointIndex(lastIndex, 100)).to.equal(5);
    });

    it('comprehensive check ensuring correct indexing and boundary handling', async () => {
      expect(await rewarderCheckpoints.getCheckpointIndex(lastIndex, 0)).to.equal(0);
      expect(await rewarderCheckpoints.getCheckpointIndex(lastIndex, 1)).to.equal(1);
      expect(await rewarderCheckpoints.getCheckpointIndex(lastIndex, 5)).to.equal(5);
      expect(await rewarderCheckpoints.getCheckpointIndex(lastIndex, 4)).to.equal(4);
      expect(await rewarderCheckpoints.getCheckpointIndex(lastIndex, 100)).to.equal(5);
    });
  });
  describe('getAmount', function () {
    before(async () => {
      rewarderCheckpoints = await ethers.deployContract('VirtualRewarderCheckpointsMock');

      // Assuming the rewarderCheckpoints has been instantiated already.
      await rewarderCheckpoints.writeCheckpoint(0, 100, 10);
      await rewarderCheckpoints.writeCheckpoint(1, 200, 20);
      await rewarderCheckpoints.writeCheckpoint(2, 300, 0);
      await rewarderCheckpoints.writeCheckpoint(3, 400, 40);
      await rewarderCheckpoints.writeCheckpoint(4, 500, 50);
      lastIndex = BigInt(5); // Update lastIndex to the latest index after all writes.
    });

    it('should return amount 0 for timestamps before the first checkpoint', async () => {
      expect(await rewarderCheckpoints.getAmount(lastIndex, 50)).to.equal(0);
    });

    it('should return the exact index for timestamps matching existing checkpoints', async () => {
      expect(await rewarderCheckpoints.getAmount(lastIndex, 99)).to.equal(0);
      expect(await rewarderCheckpoints.getAmount(lastIndex, 100)).to.equal(10);
      expect(await rewarderCheckpoints.getAmount(lastIndex, 200)).to.equal(20);
      expect(await rewarderCheckpoints.getAmount(lastIndex, 299)).to.equal(20);

      expect(await rewarderCheckpoints.getAmount(lastIndex, 300)).to.equal(0);
      expect(await rewarderCheckpoints.getAmount(lastIndex, 301)).to.equal(0);
      expect(await rewarderCheckpoints.getAmount(lastIndex, 399)).to.equal(0);

      expect(await rewarderCheckpoints.getAmount(lastIndex, 400)).to.equal(40);
      expect(await rewarderCheckpoints.getAmount(lastIndex, 500)).to.equal(50);
    });

    it('should return the nearest lower index for timestamps between checkpoints', async () => {
      expect(await rewarderCheckpoints.getAmount(lastIndex, 150)).to.equal(10);
      expect(await rewarderCheckpoints.getAmount(lastIndex, 250)).to.equal(20);
      expect(await rewarderCheckpoints.getAmount(lastIndex, 350)).to.equal(0);
      expect(await rewarderCheckpoints.getAmount(lastIndex, 450)).to.equal(40);
      expect(await rewarderCheckpoints.getAmount(lastIndex, 550)).to.equal(50);
    });

    it('should return the last index for timestamps beyond the last checkpoint', async () => {
      expect(await rewarderCheckpoints.getAmount(lastIndex, 600)).to.equal(50);
      expect(await rewarderCheckpoints.getAmount(lastIndex, 1000)).to.equal(50);
      expect(await rewarderCheckpoints.getAmount(lastIndex, 10000)).to.equal(50);
    });
  });
});

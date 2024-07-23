# Code Snippets
1. **Attaching Your Own NFT to a Managed NFT**
```js
const userNftId = 1;  // Your NFT's tokenId
const managedNftId = 21;  // Managed tokenId you want to attach to
await Voter.attachToManagedNFT(userNftId, managedNftId);
```
2. **Detaching NFT from Managed NFT**
```js
const userNftId = 1;  // Your NFT's tokenId
await Voter.dettachFromManagedNFT(userNftId);
```
3. **Calculating the Current Value of Your Attached NFT**
```js
const userNftId = 1;  // Your NFT's tokenId
let userDepositedBalance = await CompoundStrategy.balanceOf(userNftId);
let userRewardsBalance = await CompoundStrategy.getLockedRewardsBalance(userNftId);
let userFullBalance = userDepositedBalance + userRewardsBalance
```
4. **Get Attached Managed Token Id**
```js
const userNftId = 1;  // Your NFT's tokenId
let usetAttachedManagedNftId = await ManagedNFTManager.getAttachedManagedTokenId(userNftId);
```
5. **Check that user nft is attached to managed nft**
```js
const userNftId = 1;  // Your NFT's tokenId
let isAttachedToManagedNft = await ManagedNFTManager.isAttachedNFT(userNftId);
```
6. **Check that nft is managed nft**
```js
const managedNftId = 1;  // Your NFT's tokenId
let isManagedNft = await ManagedNFTManager.isManagedNFT(managedNftId);
```

7. **Change status veNFT to permanent lock**
```js
const userNftId = 1;  // Your NFT's tokenId
await VotingEscrow.lockPermanent(userNftId);
```

8. **Change status veNFT from permanent lock to normal state**
```js
const userNftId = 1;  // Your NFT's tokenId
await VotingEscrow.unlockPermanent(userNftId);
```
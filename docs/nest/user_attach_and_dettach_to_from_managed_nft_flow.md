# User Guide for Interactions with Managed NFT 
This guide provides instructions for users on how to interact with the Managed NFT functionalities provided by our smart contract. Specifically, it covers how users can attach their own NFTs to a managed tokenId and how they can detach them.

### Attaching an veNFT to a Managed TokenId
**Purpose**: Attach your NFT to a managed tokenId to engage in voting optimization strategies facilitated by the smart contract.

**Preconditions**: 
Before attaching your NFT, ensure the following conditions are met:
1. **No Active Votes**: Ensure there are no active votes for pools involving your NFT.
2. **Valid Lock**: Your NFT must have an unexpired lock period.
3. **Outside Distribution Window**: The operation should be conducted outside the distribution window to avoid conflicts with ongoing vote calculations.


#### **Steps to Attach**:

**Call the Attach Function**: 
   * Use the `attachToManagedNFT` function with your tokenId and the desired managed tokenId:
   * Parameters
      - `tokenId_`: Your NFT's tokenId.
      - `managedTokenId_`: The tokenId of the managed token you want to attach to.
   
Example transaction:
```javascript
const userNftId = 1;  // Your NFT's tokenId
const managedNftId = 21;  // Managed tokenId you want to attach to
await Voter.attachToManagedNFT(userNftId, managedNftId);
```
**This transaction occurs through the Voter contract, which handles the attachment logic.**

### Detaching an veNFT from a Managed TokenId
Detaching an NFT reverses the attachment process and removes your NFT from participation in the managed strategy.

#### **Steps to Dettach**:

**Call the Detach Function:**
   * Use the `dettachFromManagedNFT` function, providing your NFT's tokenId. 
```js
const userNftId = 1;  // Your NFT's tokenId
await Voter.dettachFromManagedNFT(userNftId);
```
**Make sure that the reward for the previous era has been distributed, otherwise it will be lost**

**This transaction occurs through the Voter contract, which handles the attachment logic.**

# Creating Signatures for PerpetualsTradersRewarderUpgradeable

To interact with the `PerpetualsTradersRewarder` contract and create valid signatures using **EIP-712**, you can use the following JavaScript function:

## Additional data (EIP-712)
The contract uses the following type hash for the EIP-712 message:
```js
    bytes32 internal constant _MESSAGE_TYPEHASH = keccak256("Message(address user,uint256 amount)");
```
The structure of the Message type is as follows:
```js
      Message: [
        { name: "user", type: "address" },
        { name: "amount", type: "uint256" },
      ],
```
## JavaScript Example: Creating Signature Process
```js
 async function createSignature(signer, userAddress, amount, contractAddress) {
  // Define the EIP-712 domain
  const domain = {
    name: "PerpetualsTradersRewarderUpgradeable",
    version: "1",
    chainId: (await ethers.provider.getNetwork()).chainId,
    verifyingContract: contractAddress,
  };

  // Define the types for the message
  const types = {
    Message: [
      { name: "user", type: "address" },
      { name: "amount", type: "uint256" },
    ],
  };

  // Define the message value
  const value = {
    user: userAddress,
    amount: amount,
  };

  // Create the signature
  let signature = await signer._signTypedData(domain, types, value);
  return signature;
}
```
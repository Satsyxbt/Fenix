### Disable VeBoost
To optimize gas usage when creating veNFTs and performing actions with them, since veBoost is no longer needed, veBoost can be explicitly disabled in the `VotingEscrow` contract.

On the `VotingEscrowUpgradeable` contract, update the veBoost address to zero:

- **[VotingEscrowUpgradeable](https://blastscan.io/address/0xC900C984a3581EfA4Fb56cAF6eF19721aAFbB4f9)** - `0xC900C984a3581EfA4Fb56cAF6eF19721aAFbB4f9`

Call `updateAddress` on this contract from the address `0x0907fb24626a06e383BD289A0e9C8560b8cCC4b5` with the following parameters:
- **key_**: "veBoost"
- **value_**: "0x0000000000000000000000000000000000000000"

#### ABI for Update Method
```json
[
    {
      "inputs": [
        {
          "internalType": "string",
          "name": "key_",
          "type": "string"
        },
        {
          "internalType": "address",
          "name": "value_",
          "type": "address"
        }
      ],
      "name": "updateAddress",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    }
]
```

### Example Call
```solidity
VotingEscrowUpgradeable(`0xC900C984a3581EfA4Fb56cAF6eF19721aAFbB4f9`).updateAddress(`veBoost`, "0x0000000000000000000000000000000000000000");
```

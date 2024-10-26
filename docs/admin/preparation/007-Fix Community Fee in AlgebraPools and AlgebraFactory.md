### Fix Community Fee in AlgebraPools and AlgebraFactory

Currently, the `protocolFee` is incorrectly set to **1%** by default, which is mistake. To correct this, follow the steps below:

**Also refer to the guide for setting up the community fee:** [dexV3-fee-distribution](https://github.com/Satsyxbt/Fenix/tree/main/docs/admin/management/dexV3).

#### Step 1: Set Default Community Fee to 10% in AlgebraFactory

From the address `0x0907fb24626a06e383BD289A0e9C8560b8cCC4b5`, call the `setDefaultCommunityFee(uint16 newDefaultCommunityFee)` method on the [AlgebraPoolFactory](https://blastscan.io/address/0x7a44CD060afC1B6F4c80A2B9b37f4473E74E25Df#writeProxyContract) contract (`0x7a44CD060afC1B6F4c80A2B9b37f4473E74E25Df`) with the following parameter: `100` which equals a protocol fee of 10%. If you need to set a different value, adjust the parameter accordingly.

**Example**:
```solidity
AlgebraPoolFactory(0x7a44CD060afC1B6F4c80A2B9b37f4473E74E25Df).setDefaultCommunityFee(100);
```

#### Step 2: Set Community Fee to 10% for Already Deployed V3 Pools

From the address `0x0907fb24626a06e383BD289A0e9C8560b8cCC4b5`, call the `setCommunityFee(uint16 newCommunityFee)` method on each deployed and initialized `AlgebraPool` contract.

Some of these contracts may fail because they are not initialized (e.g., WETH/FNX, USDB/FNX pools). You can ignore these failures; upon initialization, they will inherit the default community fee from the `AlgebraPoolFactory`.

**Example**:
```solidity
AlgebraPool(0x1d74611f3ef04e7252f7651526711a937aa1f75e).setCommunityFee(100);
AlgebraPool(0xc066a3e5d7c22bd3beaf74d4c0925520b455bb6f).setCommunityFee(100);
...
```

#### Target List
```
"0x1d74611f3ef04e7252f7651526711a937aa1f75e",
"0xc066a3e5d7c22bd3beaf74d4c0925520b455bb6f",
"0x86d1da56fc79accc0daf76ca75668a4d98cb90a7",
"0x1fe38ea700f0b8b013be01e58b02b1da3956379a",
"0xc5910a7f3b0119ac1a3ad7a268cce4a62d8c882d",
"0x3bafe103742da10a4fece8fc5e800df07d645439",
"0xf2bb3403e80adc9272c43b386c76e54d5bb604a5",
"0xf63e385e854e082c78df0627b411fdb78877faa1",
"0xce274e4ae83baadd1d3b88e1ed24886e05aca345",
"0x117106000ceb709ba3ec885027d111463204d6b6",
"0x6a1de1841c5c3712e3bc7c75ce3d57dedec6915f",
"0xcf68cdfea89f9e6964d4c2bd8a42eba5da9f945d",
"0x886369748d1d66747b8f51ab38de00dea13f0101",
"0x8e57e61b7524a2f56fd01bbfe5de9bb96ed186b4",
"0xe3fac59382987466d7f812df56c50739b99a907a",
"0x24b711e1d32e28a143e1a9cfdfe03a39d1acc771",
"0x7113c00b5275b0b9c16686e5ac1164978b505c5d",
"0xbad7a5de96b7df589252ced73426d4b59f90b466",
"0x46f2aa2aa7d31ddd237d620e52a33a8d5af2a5ab",
"0x3a8fa7bdbb3bd2a523796b145e5dd23b45019dbe",
"0x21d5d5998c3d0feea70b5980fdac9dd6b8a12761",
"0xb50a80bba0ff07f4bc3434c593e86663fe05abe2",
"0x54bb102e85ee68a234fa06ece299346941d68d07",
"0x9304ba542df9bc61dd1c97c073ed35f81cab6149",
"0xe53b1da56f90c9529f2db1bb8711c3f1cc6f03bd",
"0x635512a1333ad0822f5ba4fd6479daa1df8b77e1",
"0x5083e43b015296c75de0af519917c035309e80e4",
"0x28abbaadfacd46196217c23bc6402a0a458973a5",
"0xbcf0265f4bd3cb293b709fab0bf5c83c7eeb6b74",
"0x1eba6f6cfdb86e965040bf9e75d3ded9a3fd22a5",
"0x90f2eaf2db0d8400c9f565aa3c139ddffbe857d0",
"0x3acde0b7f51703c2fbf0a382f831123560b742b9",
"0x047d5d8911d18aa5e64e666e53af2b47b46ab363",
"0x9508122abdd654b68c7dbf5bdba329b852e4a512",
"0xc1fd5e0b3388c66dfad458ded01dcddae68cb03e",
"0x28d7de5e9592cbd951dc3b22325fdfa89972f6db",
"0x4a28f50f15efedf44af0d376fdc2e319fa8ccef8",
"0xd0cd894c605a9eedacbc0fa9bd8440627a5d37b1",
"0x7f7d282846cb4806f9121b0b5ef61afaae64f257",
"0x8921e94efaca5f39a3a1f7b62e645518082d6a88",
"0xc8252c4f9136209ec47534bf1c0781307ec9a86f",
"0x4c577f4873061003d6c83eaac20e24397ff5b89b",
"0x3de72e4996ffedf9b6e4615dd43bbe1c8735eac0",
"0x74b1ff6b82e734ca5469e7e874ca0a2d4d35a151",
"0x008cac102e95e4f42710bb94d5f14d3af9052916",
"0x2db9d4ebe4b94637e0cf2383a4d283fcb9aba93f",
"0x9553d38eb05415ca1d34d51e5adb2f24d962df9a",
"0x8964391b91a7a5bbe86094a5a6eeca5d6ec988f7",
"0x99b70e3811ca251b42aeaad5a7dd1343950ef542",
"0x4fe43b6b73407bc3f1a3336e05c0b9be6e399626",
"0x3e00b9640c28906f8480cf714dac76c313af35ae",
"0xa35203ffb424c8845807c0174f5fb0334235a313",
"0x15916242e683948271e9130da06fe102aa74b51e",
"0xb3b4484bdfb6885f96421c3399b666a1c9d27fca",
"0x2e3281e50479d6c42328ba6f2e4afd971e43ca2d",
"0x558c091e64910ba62a58c279a55fefc864251d98",
"0xb7c9062c306f70f7325ef1ab8b158aacafd59c97"
```

These steps will correct the `protocolFee` and ensure proper community fee distribution across the existing pools.


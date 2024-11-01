### Accept Ownership

The process of ownership transfer has been initiated for several contracts. Some of these contracts inherit from `Ownable2Step`, which requires the new owner to explicitly accept the transfer.

The following contracts require the ownership acceptance:
```json
[
    "0x311F7981d7159De374c378Be0815DC4257b50468",
    "0xaf85834fc0d0302c82919E10c8817609a310fd2c"
]
```

From the address `0x0907fb24626a06e383BD289A0e9C8560b8cCC4b5`, call the `acceptOwnership()` method on each of the contracts listed above to accept the ownership transfer.


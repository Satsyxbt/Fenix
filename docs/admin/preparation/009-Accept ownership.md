### Accept Ownership

The process of ownership transfer has been initiated for several contracts. Some of these contracts inherit from `Ownable2Step`, which requires the new owner to explicitly accept the transfer.

The following contracts require the ownership acceptance:
```json
[
    "0xC900C984a3581EfA4Fb56cAF6eF19721aAFbB4f9",
    "0x8231A273e43B042D374d8D11Fe904482d2c91CC6"
]
```

From the address `0x0907fb24626a06e383BD289A0e9C8560b8cCC4b5`, call the `acceptOwnership()` method on each of the contracts listed above to accept the ownership transfer.



## Project overiew

The `Fenix` protocol is a modified version of `Chronos & Thena`, introducing innovations and changes

At its core, the protocol is based on the `ve(3,3)` concept, with a new set of integrations and a variable set of rules.

### Links
- [Fenix ve(3,3) Core](https://github.com/Satsyxbt/Fenix)
- [Docs](https://docs.fenixfinance.io/)


## Setup
### Getting the code
Clone this repository
```sh
git clone --branch code4arena-04-09-2024 --recursive -j8  https://github.com/Satsyxbt/Fenix
```
or
```sh
git clone https://github.com/Satsyxbt/Fenix
cd fenix
git submodule update --init --recursive
git checkout code4arena-04-09-2024
```

Enter into the directory
```sh
cd fenix
```

Install dependency
```sh
npm install
```

### Running basic tests
To run the existing tests, also need to compile the artifacts of the fenix-dex-v3 library
```
sh
1.
    cd lib/fenix-dex-v3
    npm install

2. 
    cd src/core
    npm install
    npx hardhat compile
3.
    cd src/periphery
    npm install
    npx hardhat compile
```
run tests command
```sh
npm run test
```
or
```sh
npx hardhat test
```


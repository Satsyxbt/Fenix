Описанний порядок дій з розгортання контрактів протоколу:
## Визначення ціни газу

Ціна газу береться з актуальний значень target мережі і передбачає завищення для норального деплою на 10-20% шляхом хардоку газ прайсу або внесення специфічної конфігурації в hardhatconfig


## Очищення минулих залишків розгортання
Файл 'scripts/deploys.json' має бути очищенний, перед початком деплою чистого протоколу, у випадку наявності записів в ньому ці записи будуть використовуватись в подальшому деплої

## Деплой реалізацій до існуючих контрактів які будуть проксі/upgradeable

Це включає в себе наступний список:

1. Core:
   1. `MinterUpgradeable`
   2. `VeArtProxyUpgradeable`
   3. `VoterUpgradeable`
   4. `VotingEscrowUpgradeable`
2. Additional:
   1. `VeBoostUpgradeable`
   2. `VeFnxDistributorUpgradeable`
3. Bribes:
   1. `BribeFactoryUpgradeable`
   2. `BribeUpgradeable`
4. Gauges:
   1.  `GaugeFactoryUpgradeable`
   2.  `GaugeUpgradeable`
5. DexV2:
   1.  `PairFactoryUpgradeable`
   2.  `Pair`
6. Integration:
   1. `AlgebraFNXPriceProviderUpgradeable`
   2. `FeesVaultUpgradeable`

Розгортання відбуваєть простим деплоєм контрактів на мережу, без будь-якої конфігурації чи змінн. Задеплоїні контракти будуть використані, як адреси реалізацій кінцевих контрактів


`npx hardhat run .\scripts\1_deploy_implementations.ts`

## Деплой ProxyAdmin
Для управлніння зміннами реалізацій і тд, зі сторони `Deployer`, відбувається розгортання ProxyAdmin від OZ прости деплоєм на мережу

Власність над контрактом залишаєтсья на `Deployer`

`npx hardhat run .\scripts\2_deploy_proxy_admin.ts`

## Розгортання TransparentUpgradeableProxy для передбачених контрактів

!!! IMPORTANT для данного етапу повинні бути задеплоїні реалізації і Proxy Admin на минулих кроках
!!! IMPORTANT розгортання не передбачає моментальної ініаціалізації, відповідко шкідливі користувачі матимуть змогу зафронтранити або dos розгорнутий проксі


Список контрактів для який розгортається TransparentUpgradeableProxy:
1. Core:
   1. `MinterUpgradeable` - ``
   2. `VeArtProxyUpgradeable`
   3. `VoterUpgradeable`
   4. `VotingEscrowUpgradeable`
2. Additional:
   1. `VeBoostUpgradeable`
   2. `VeFnxDistributorUpgradeable`
3. Bribes:
   1. `BribeFactoryUpgradeable`
4. Gauges:
   1. `GaugeFactoryUpgradeable` #1 for V2
   2. `GaugeFactoryUpgradeable` #2 for ICHI
   3. `GaugeFactoryUpgradeable` #2 for V3
5. DexV2:
   1.  `PairFactoryUpgradeable`
6. Integration:
   1. `AlgebraFNXPriceProviderUpgradeable`


Аргументами конструктора при розгортанні являються наступні:
- `implementation` для заданного контракту взятий з минулих кроках деплою
- `proxyAdmin` адреса контракту задеплоїного в минулих кроках
- `data` - `0x` не передбачається ініціалізація зразу, тому залишається пустим


`npx hardhat run .\scripts\3_deploy_proxies.ts`

## Розгортання Fenix

Відбувається простим деплоєм контракта `Fenix` на мережу

Після розгортання `Deployer` отримає на баланс `7_500_000 FNX`

**Вхідними параметрами є:**
- `blastGovernor_` - адреса управління бласт
- `minter_` - адреса на яку буде передано права мінтингу і власність над токеном. 
Важливо для початку деплою слід виставити адресу `Deployer`, після зміннити на актуальний контракт мінтера

## Розгортання FeesVaultFactory

Відбувається простим деплоєм контракта на мережу

**Вхідними параметрами є:**
- `blastGovernor_` - адреса управління бласт
- `FeesVault - implementation`
- `Voter - proxy` - ардеса не ініціалізованого проксі


## Ініціалізація основних контрактів

На данному етапі відбувається ініціалізація уже розгорнутих проксі, передбачається що контракти можуть бути ініціалізовані адресами інших контрактів які ще не є ініціалізовані


Порядок і ініціалізація:
1. `BribeFactory` - (`BlastGovernor`, `Voter - proxy`, `Bribe - implementation`)
2. `GaugeFactory #1` - (`BlastGovernor`, `Voter - implementation`, `Bribe - implementation`, `MerkleDistributor - ZERO_ADDRESS`)
3. `GaugeFactory #2` - (`BlastGovernor`, `Voter - implementation`, `Bribe - implementation`, `MerkleDistributor - ZERO_ADDRESS`)
4. `GaugeFactory #3` - (`BlastGovernor`, `Voter - implementation`, `Bribe - implementation`, `MerkleDistributor - ZERO_ADDRESS`)
5. `VotingEscrow` - (`BlastGovernor`, `Fenix - instance`, `VeArtProxy - proxy`, `MerkleDistributor - ZERO_ADDRESS`)
6. `PairFactory` - (`BlastGovernor`, `PairImplementation - implementation`, `FeesVaultFactory - instance`)
7. `Minter` - (`BlastGovernor`, `Voter - proxy`, `VotingEscrow - proxy`)
8. `Voter` -  (`BlastGovernor`, `VotingEscrow - proxy`, `PairFactory - proxy`, `GaugeFactory - proxy`, `BribeFactory - proxy`)



## Розгортання MerklGaugeMiddleman
Відбувається шляхом деплою з встановленними параметрами
- `governor_` - `BlastGovernor`
- `token_` - fenix token address
- `merklDistributionCreator_` - actual merkle distributor creator address on target network
  
## Розгортання RouterV2
Відбувається шляхом простого деплою і встановлення параметрів:
- `BlastGovernor`
- `PairFactory`
- `WETH` - адреса WETH вибраної мережі
  
## Налаштування Gas Mode в усіх контрактах
Потрібно для всіх розгорнутих контрактах встановити мод на Claimable

## Початкові налаштування і конфігурації
1. Передача права власності з Deployer на Minter контракт над Fenix токеном 
2. Додавання PairFactory як створювача для FeesVault в FeesVaultFactory
3. Додавання AlgebraFactory V3 як створювача для FeesVault в FeesVaultFactory
4. Додавання встановлення в AlgebraFactory нової фабрики FeesVaultFactory
5. Установлення правильнї адреси Minter в Voter контракті
6. Установлення адреси VotingEscrow в Voter контракті
7. Встановлення MerkleDistributor в GaugeFactoryType2, GaugeFactoryType3
8. Встановлення фабрик для типу 2 Gauge, і типу 3 Gauge в Voter
9. Виставлення стандартних налаштувань в V2 парах для WETH/USDB ребейз токенів
10. Initialize PriceProvider
11. Initialize VeBoost
12. Setup VeBoost to VotingEscrow contract
   

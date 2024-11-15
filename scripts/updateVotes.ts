import { ethers } from 'hardhat';

const TotalVotePower = BigInt('21892234832216525982318717');
const PRECISION = BigInt('999992');

const votesChanges = [
  {
    name: 'v3, WETH/FNX',
    pool: '0x2e3281e50479d6c42328ba6f2e4afd971e43ca2d',
    weight: '0',
    internalBribe: '0xed441533b4909130ffF0115d6F19F9AA2932f089',
    externalBribe: '0x88398F700901235C6C6D19b10C69f5c312b21F24',
    votePower: '0',
  },
  {
    name: 'v3, USDB/FNX',
    pool: '0xb3b4484bdfb6885f96421c3399b666a1c9d27fca',
    weight: '0',
    internalBribe: '0x42BDbF8f3FE242D458755c6Ff9D1BDfebC2d1835',
    externalBribe: '0x011acD526c81684824096a4e379b5868cE7BED2c',
    votePower: '0',
  },
  {
    name: 'v3, BLAST/FNX',
    pool: '0x558c091e64910ba62a58c279a55fefc864251d98',
    weight: '0',
    internalBribe: '0xFAeA306492cB9382909E6947B348f0e4Bd2acFb7',
    externalBribe: '0x1522587d2FCba2c2983178e87D5F669714dFEa8a',
    votePower: '0',
  },
  {
    name: 'v3, WETH/weETH',
    pool: '0x9304ba542df9bc61dd1c97c073ed35f81cab6149',
    weight: '0',
    internalBribe: '0x286552E4081079c9610D7A3D8641Ea1f1DAC51a9',
    externalBribe: '0x06A9d4de38aB9F33BE77e66B47D0A591E008B799',
    votePower: '0',
  },
  {
    name: 'v3, WETH/ezETH',
    pool: '0x635512a1333ad0822f5ba4fd6479daa1df8b77e1',
    weight: '0',
    internalBribe: '0x5Ef4374594Dc6635d8237Fa69A5C337393aeB359',
    externalBribe: '0xEDe840FF86D9159C0062f7cA7C8f09ac2970Acd1',
    votePower: '0',
  },
  {
    name: 'v3, WETH/wrsETH',
    pool: '0xe53b1da56f90c9529f2db1bb8711c3f1cc6f03bd',
    weight: '0',
    internalBribe: '0xb854507Dd724B3461d717cbeAeb7Ee5a4c0bA3c4',
    externalBribe: '0x3882518e7c0052C6dAFF9633BeC87e42c45cccd6',
    votePower: '0',
  },
  {
    name: 'v3, USDB/USDe',
    pool: '0xd0cd894c605a9eedacbc0fa9bd8440627a5d37b1',
    weight: '0',
    internalBribe: '0x87FF99d8980155679883B93bc545DFF84154F7c5',
    externalBribe: '0x48d6F83FB73c58E010fc26549597295531620dF6',
    votePower: '0',
  },
  {
    name: 'v3, WETH/USDB',
    pool: '0x1D74611f3EF04E7252f7651526711a937Aa1f75e',
    weight: '28080',
    internalBribe: '0xdAeC786C6248cf42878559588FFe6D62d4e3d277',
    externalBribe: '0xbd3FB8f73A862E0f310A0bDd8b8DA7460e58Dfa5',
    votePower: '614738871999616046511881',
  },
  {
    name: 'v3, WETH/BLAST',
    pool: '0xc8252c4f9136209ec47534bf1c0781307ec9a86f',
    weight: '31990',
    internalBribe: '0x1104a729daDde1243DAdB0Ef8f979999b1A62a14',
    externalBribe: '0x9785E2456239Dd867BA576f13B2EAB54E958D3f7',
    votePower: '700338194988166571506947',
  },
  {
    name: 'v3, BLAST/USDB',
    pool: '0x4c577f4873061003d6c83eaac20e24397ff5b89b',
    weight: '21421',
    internalBribe: '0x73c58D3aFd8Bd374C87c8F5dF439e83eA47FD5AF',
    externalBribe: '0x741e31360FBc9577a3C8d7bA4D464D775dC93e58',
    votePower: '468957313999422198444836',
  },
  {
    name: 'v2, DETH/WETH',
    pool: '0xcb0e3bd2adc621489dfef404821b5b11f840fa58',
    weight: '160646',
    internalBribe: '0x8EC1C2a79C48C81C1C53c3f2a3D7FF861a40Cdf4',
    externalBribe: '0x7e2F7E8326c59E77A7B8D4b81bBA6366d96CA117',
    votePower: '3516928092280994280909819',
  },
  {
    name: 'v3, MORE/USDB',
    pool: '0xb7c9062c306f70f7325ef1ab8b158aacafd59c97',
    weight: '161172',
    internalBribe: '0xD26B07348cF70506Ae599Da39370a2b610dF16ce',
    externalBribe: '0x625ead6b481c54E68A63a91eC9F2d0dcF33660f0',
    votePower: '3528443499926001333632941',
  },
  {
    name: 'v3, fDAO/WETH',
    pool: '0x886369748d1d66747b8f51ab38de00dea13f0101',
    weight: '142812',
    internalBribe: '0xC9cf13bb1DbE5b9E6c94413FF2414f4dFA2832C2',
    externalBribe: '0x2f627A7fEB4F81cd32Fc1d1B5327Bcc0BeFE8C08',
    votePower: '3126498852849329303221326',
  },
  {
    name: 'v2, PREON/STAR',
    pool: '0x94d3a9fe1265e3eb1d89849c325d931924cec88f',
    weight: '81693',
    internalBribe: '0xC0E677af718982EdFb5a25df534B8c009544478E',
    externalBribe: '0xBF4183A5704D533b4Bc68b33749129Cd70491A5D',
    votePower: '1788456647801447068650112',
  },
  {
    name: 'v2, SDK/WETH',
    pool: '0xb485fdabb73274ee573700aaf37e92b6273a82c2',
    weight: '38474',
    internalBribe: '0x052fFC7D75E46E3478Fb03D6c3f4570EC6EfaBd3',
    externalBribe: '0x33e6E16Ef750812d833c3Eb0f0EBaDe69676eefB',
    votePower: '842288581243348567432269',
  },
  {
    name: 'v3, USD+/USDB',
    pool: '0x6a1de1841c5c3712e3bc7c75ce3d57dedec6915f',
    weight: '18500',
    internalBribe: '0x7cFc24F375d1E0A0C1F2D359628380c362B0ddb9',
    externalBribe: '0xcC4C0158d815096c154306322534C30463c93cEf',
    votePower: '405009584472681512124993',
  },
  {
    name: 'v2, IBEX/WETH',
    pool: '0x8c22d23ec102c9e098c8e0b9ed4ea01aa0b4be35',
    weight: '43056',
    internalBribe: '0x0b323Fb6d871bE8a39C922009C7Ea806a3e105c9',
    externalBribe: '0xF30EA86Dca356fB377Dc0802400Cf4Cc6F797E8F',
    votePower: '942599603732744604651551',
  },
  {
    name: 'v3, KAP/WETH',
    pool: '0xb50a80bba0ff07f4bc3434c593e86663fe05abe2',
    weight: '44456',
    internalBribe: '0x1862508E8d0dA0ed24469BaDCfb5b08FE173Ace0',
    externalBribe: '0x12508FcF8e22a7f1Af9247f934Fb1696C47a5Bd8',
    votePower: '973248977692839421785335',
  },
  {
    name: 'v2, GOLD/WETH',
    pool: '0x5cfd0c2f2ecda7d4d0475928ce2a83448f66e89c',
    weight: '4983',
    internalBribe: '0x5e8C1BCa6C4C9b6332fD50f75E062aeB86d46F48',
    externalBribe: '0x59359AE641012b68Ac0bD10CEbee958e7c34c994',
    votePower: '109089878887966052698315',
  },
  {
    name: 'v3, sfrxETH/WETH',
    pool: '0x1eba6f6cfdb86e965040bf9e75d3ded9a3fd22a5',
    weight: '78525',
    internalBribe: '0x01a47751fCdC94b16A4D9415620A53E08c8aeF26',
    externalBribe: '0x3029895C8119e248864C7c92219cD280E3F72807',
    votePower: '1719101493011746796735951',
  },
  {
    name: 'v3, sFRAX/USDB',
    pool: '0x28d7de5e9592cbd951dc3b22325fdfa89972f6db',
    weight: '78527',
    internalBribe: '0xC9b77843E67b9357112da22DCa0B209003816b53',
    externalBribe: '0x60Cc52ad791653d10AF86b9aF4bce202637fD758',
    votePower: '1719145277831689789331856',
  },
  {
    name: 'v3, DEUS/WETH',
    pool: '0x117106000ceb709ba3ec885027d111463204d6b6',
    weight: '64513',
    internalBribe: '0x188790644fB7Ec4E313CEfddA28b5FE801Cd637e',
    externalBribe: '0xb2c7c1bEe2453bd2a4a18E8cceF5a064Ed31CE9F',
    votePower: '1412345044491140669822685',
  },
  {
    name: 'v3, HYPERS/WETH',
    pool: '0xa35203ffb424c8845807c0174f5fb0334235a313',
    weight: '1088',
    internalBribe: '0xc71591E23879b67b0699f26CAaF83993e3d093a6',
    externalBribe: '0xEd1F8ABC262A34f912DbDe1eb43E3568f6C0E765',
    votePower: '23818942048987972172540',
  },
  {
    name: 'v3, WBTC/WETH',
    pool: '0xc066a3e5d7c22bd3beaf74d4c0925520b455bb6f',
    weight: '56',
    internalBribe: '0x47Ad6014CeCDe5023ef9b7F4E3A9056Fc2a1d083',
    externalBribe: '0xa89d8821f18C3082dc8b175daF70bdf25A72ca39',
    votePower: '1225974958403792685351',
  },
];

async function main() {
  //   let withCalcualteDistribution: any[] = [];
  //   votesChanges.forEach((t: any) => {
  //     t.votePower = (t.weight * TotalVotePower) / PRECISION;
  //     withCalcualteDistribution.push(t);

  //     console.log(t.pool, t.weight, ethers.formatEther(t.votePower));
  //   });

  console.log(JSON.stringify(votesChanges, (key, value) => (typeof value === 'bigint' ? value.toString() : value), 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

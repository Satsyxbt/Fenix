import { ethers } from 'hardhat';
import { Signer } from "ethers";
import { EmissionManagerUpgradeable } from '../../typechain-types/contracts/EmissionManagerUpgradeable';
import { EmissionManagerUpgradeable__factory, Fenix, Fenix__factory, ProxyAdmin, ProxyAdmin__factory, TransparentUpgradeableProxy__factory } from '../../typechain-types/index';

async function completeFixture(): Promise<
    { 
        wallets: { 
            deployer: Signer,
            otherUser: Signer,
            others: Signer[],
        },
        proxyAdmin: ProxyAdmin,
        fenix: Fenix,
        emissionManagerProxy: EmissionManagerUpgradeable,
        emissionManagerImplementation: EmissionManagerUpgradeable
    }> 
    {
    const [deployer, otherUser, ...others] = await ethers.getSigners();

    const fenixFactory = await ethers.getContractFactory("Fenix") as Fenix__factory

    const fenix = await fenixFactory.connect(deployer).deploy(deployer.address)

    const emFactory = await ethers.getContractFactory("EmissionManagerUpgradeable") as EmissionManagerUpgradeable__factory

    const emFactoryImplementation = await emFactory.deploy()

    const proxyFactory = await ethers.getContractFactory('TransparentUpgradeableProxy') as TransparentUpgradeableProxy__factory;
    const proxyAdminFacotry = await ethers.getContractFactory('ProxyAdmin') as ProxyAdmin__factory;

    const proxyAdmin = await proxyAdminFacotry.deploy()

    const emissionManagerProxy = await proxyFactory.deploy(
        await emFactoryImplementation.getAddress(),
        await proxyAdmin.getAddress(),
        "0x"
    )
    
    return {
        wallets: {
            deployer: deployer,
            otherUser: otherUser,
            others: others
        },
        proxyAdmin: proxyAdmin, 
        fenix: fenix,
        emissionManagerProxy: emFactory.attach(await emissionManagerProxy.getAddress()) as EmissionManagerUpgradeable,
        emissionManagerImplementation: emFactoryImplementation
    };
  };
  
  export default completeFixture;
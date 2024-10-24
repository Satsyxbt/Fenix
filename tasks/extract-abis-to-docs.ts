import { task } from 'hardhat/config';
import fs from 'fs';
import path from 'path';
import { Minimatch } from 'minimatch';

import AllConfigs from './config';
const Config = AllConfigs['extract-abis-to-docs'];

task('extract-abis-to-docs', `Extracts ABI from compiled contracts and saves them to ${Config.output}`).setAction(async function (
  taskArguments,
  hre,
) {
  const outputDir = path.join(hre.config.paths.root, 'docs/abi');

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const artifacts = await hre.artifacts.getAllFullyQualifiedNames();
  for (const artifactName of artifacts) {
    const skipPatterns = Config.skipPatterns || [];

    if (
      skipPatterns.some((pattern) => {
        const mm = new Minimatch(`**/${pattern}/**`);
        return mm.match(artifactName) || new Minimatch(`**/${pattern}`).match(artifactName);
      })
    ) {
      console.log(`Skipping contract ${artifactName} due to skip pattern.`);
      continue;
    }

    const artifact = await hre.artifacts.readArtifact(artifactName);

    if (artifact.abi.length < (Config.minAbiFragmentsToInclude || 0)) continue;

    const contractName = artifactName.split(':').pop();
    if (!contractName) continue;

    if (
      skipPatterns.some((pattern) => {
        return pattern.toLocaleLowerCase() === contractName.toLocaleLowerCase();
      })
    ) {
      console.log(`Skipping contract ${artifactName} due to skip pattern.`);
      continue;
    }

    const abiPath = path.join(outputDir, `${contractName}.json`);

    fs.writeFileSync(abiPath, JSON.stringify(artifact.abi, null, 2), 'utf-8');
    console.log(`ABI for contract ${contractName} saved to ${abiPath}`);
  }

  console.log('ABI extraction completed.');
});

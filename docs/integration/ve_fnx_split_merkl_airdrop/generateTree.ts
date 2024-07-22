import { StandardMerkleTree } from '@openzeppelin/merkle-tree';
import * as fs from 'fs';
import * as path from 'path';

// Define the types for rewards data
interface RewardEntry {
  address: string;
  amount: string;
}

// Define the path to the input JSON file
const inputFilePath = path.join(__dirname, 'input.json');

// Define the path to the output JSON file
const outputFilePath = path.join(__dirname, 'output.json');

// Read the rewards data from the input JSON file
const rewardsData: RewardEntry[] = JSON.parse(fs.readFileSync(inputFilePath, 'utf8'));

// Define the rewards list entries
const rewardsListEntries = rewardsData.map((entry: RewardEntry) => [entry.address, entry.amount]);

console.log('Rewards List Entries Count:', rewardsListEntries.length);

// Create the Merkle Tree
const tree = StandardMerkleTree.of(rewardsListEntries, ['address', 'uint256']);

console.log('Merkle Tree Root:', tree.root);

// Generate the proofs for each entry
const proofs = rewardsListEntries.map(([address, amount]) => {
  const proof = tree.getProof([address, amount]);
  return {
    address,
    amount,
    proofs: proof,
  };
});

// Output the Merkle root and proofs to the output JSON file
const outputData = {
  generatedTimestamp: Math.floor(Date.now() / 1000),
  merkleRoot: tree.root,
  proofs: proofs,
};

fs.writeFileSync(outputFilePath, JSON.stringify(outputData, null, 2));

console.log('Merkle Tree and proofs have been generated and saved to', outputFilePath);

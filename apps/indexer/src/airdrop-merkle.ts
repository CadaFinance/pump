import { encodeAbiParameters, encodePacked, keccak256, type Address, type Hex } from "viem";

export type MerkleAllocation = {
  address: Address;
  amount: bigint;
  proof: Hex[];
};

export function merkleLeaf(account: Address, amount: bigint): Hex {
  const inner = keccak256(
    encodeAbiParameters(
      [
        { name: "account", type: "address" },
        { name: "amount", type: "uint256" }
      ],
      [account, amount]
    )
  );
  return keccak256(encodePacked(["bytes32"], [inner]));
}

export function buildMerkleTree(leaves: Hex[]): { root: Hex; layers: Hex[][] } {
  if (leaves.length === 0) {
    throw new Error("Cannot build Merkle tree with zero leaves");
  }

  const sorted = [...leaves].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  const layers: Hex[][] = [sorted];

  while (layers[layers.length - 1]!.length > 1) {
    const current = layers[layers.length - 1]!;
    const next: Hex[] = [];

    for (let i = 0; i < current.length; i += 2) {
      const left = current[i]!;
      const right = i + 1 < current.length ? current[i + 1]! : left;
      const [a, b] = left < right ? [left, right] : [right, left];
      next.push(keccak256(encodePacked(["bytes32", "bytes32"], [a, b])));
    }

    layers.push(next);
  }

  return { root: layers[layers.length - 1]![0]!, layers };
}

export function getProof(layers: Hex[][], leaf: Hex): Hex[] {
  const proof: Hex[] = [];
  let index = layers[0]!.indexOf(leaf);
  if (index === -1) {
    throw new Error("Leaf not found in Merkle tree");
  }

  for (let layer = 0; layer < layers.length - 1; layer++) {
    const currentLayer = layers[layer]!;
    const isRight = index % 2 === 1;
    const siblingIndex = isRight ? index - 1 : index + 1;
    const sibling = siblingIndex < currentLayer.length ? currentLayer[siblingIndex]! : currentLayer[index]!;
    proof.push(sibling);
    index = Math.floor(index / 2);
  }

  return proof;
}

export function buildAllocationsWithProofs(
  entries: Array<{ address: Address; amount: bigint }>
): { root: Hex; allocations: MerkleAllocation[] } {
  const leaves = entries.map((entry) => merkleLeaf(entry.address, entry.amount));
  const { root, layers } = buildMerkleTree(leaves);

  const allocations = entries.map((entry, index) => ({
    address: entry.address,
    amount: entry.amount,
    proof: getProof(layers, leaves[index]!)
  }));

  return { root, allocations };
}

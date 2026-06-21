const BPS = 10000n;
const RANK1_BPS = 1500n;
const RANK2_BPS = 1000n;
const RANK3_BPS = 500n;
const RANK4_100_BPS = 7000n;
const RANK4_100_COUNT = 97n;
export function rewardAmountForRank(totalReward, rank) {
    if (rank < 1 || rank > 100 || totalReward <= 0n)
        return 0n;
    if (rank === 1)
        return (totalReward * RANK1_BPS) / BPS;
    if (rank === 2)
        return (totalReward * RANK2_BPS) / BPS;
    if (rank === 3)
        return (totalReward * RANK3_BPS) / BPS;
    return (totalReward * RANK4_100_BPS) / BPS / RANK4_100_COUNT;
}
export function buildWinnerAmounts(totalReward, winnerCount) {
    const capped = Math.min(Math.max(winnerCount, 0), 100);
    const amounts = [];
    for (let rank = 1; rank <= capped; rank++) {
        amounts.push(rewardAmountForRank(totalReward, rank));
    }
    return amounts;
}
export function sumAmounts(amounts) {
    return amounts.reduce((sum, value) => sum + value, 0n);
}

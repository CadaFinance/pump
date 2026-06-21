import { blockDate, dbAddress } from "./utils.js";
export const TASK_KEYS = {
    dailySwap: "LAUNCHPAD_DAILY_SWAP",
    deployMeme: "LAUNCHPAD_DEPLOY_MEME",
    firstSmartBuy: "LAUNCHPAD_FIRST_SMART_BUY",
    volumeMonster: "LAUNCHPAD_VOLUME_MONSTER",
    kingOfHill: "LAUNCHPAD_KING_OF_HILL"
};
export class PointsBridge {
    vm1Pool;
    constructor(vm1Pool) {
        this.vm1Pool = vm1Pool;
    }
    async award(input) {
        if (!this.vm1Pool)
            return;
        await this.vm1Pool.query(`
        SELECT *
        FROM launchpad_award_points($1, $2, $3, $4, $5, $6::jsonb)
      `, [
            dbAddress(input.address),
            input.taskKey,
            `${input.taskKey}:${input.eventId}`,
            input.txHash.toLowerCase(),
            input.daily ? blockDate(input.blockTime) : null,
            JSON.stringify(input.metadata ?? {})
        ]);
    }
}

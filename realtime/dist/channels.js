export const REDIS_CHANNELS = {
    board: "pump:board",
    koth: "pump:koth",
    tradePrefix: "pump:trade:",
    walletPrefix: "pump:wallet:",
};
export function tradeRoom(tokenAddress) {
    return `token:${tokenAddress.toLowerCase()}`;
}
export function walletRoom(walletAddress) {
    return `wallet:${walletAddress.toLowerCase()}`;
}
export function arenaRoom() {
    return "arena";
}
export function redisChannelToRooms(channel, payload) {
    if (channel === REDIS_CHANNELS.board)
        return [arenaRoom()];
    if (channel === REDIS_CHANNELS.koth)
        return [arenaRoom()];
    if (channel.startsWith(REDIS_CHANNELS.tradePrefix)) {
        const token = channel.slice(REDIS_CHANNELS.tradePrefix.length);
        return [tradeRoom(token), arenaRoom()];
    }
    if (channel.startsWith(REDIS_CHANNELS.walletPrefix)) {
        const wallet = channel.slice(REDIS_CHANNELS.walletPrefix.length);
        return [walletRoom(wallet)];
    }
    return [];
}
export function parseClientMessage(raw) {
    try {
        const data = JSON.parse(raw);
        if (data.type === "subscribe" || data.type === "unsubscribe") {
            if (typeof data.room !== "string" || !data.room.trim())
                return null;
            return data;
        }
        if (data.type === "ping")
            return data;
        return null;
    }
    catch {
        return null;
    }
}

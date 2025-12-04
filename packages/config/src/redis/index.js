"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRedisUrl = getRedisUrl;
const env_1 = require("../env");
function getRedisUrl() {
    return (0, env_1.getConfig)().REDIS_URL;
}
//# sourceMappingURL=index.js.map
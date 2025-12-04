"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDatabaseUrl = getDatabaseUrl;
const env_1 = require("../env");
function getDatabaseUrl() {
    return (0, env_1.getConfig)().DATABASE_URL;
}
//# sourceMappingURL=index.js.map
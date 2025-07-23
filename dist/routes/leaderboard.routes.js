"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const leaderboardController_1 = require("../controllers/leaderboardController");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// Public routes
router.get('/', leaderboardController_1.getLeaderboard);
// Admin routes
router.get('/export', auth_1.authenticateAdmin, leaderboardController_1.exportLeaderboard);
exports.default = router;
//# sourceMappingURL=leaderboard.routes.js.map
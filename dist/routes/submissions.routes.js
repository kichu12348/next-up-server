"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const submissionsController_1 = require("../controllers/submissionsController");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// Public routes
router.post('/', submissionsController_1.createSubmission);
router.get('/:email', submissionsController_1.getSubmissionsByEmail);
// Admin routes
router.get('/admin/list', auth_1.authenticateAdmin, submissionsController_1.getAdminSubmissions);
router.patch('/admin/:id', auth_1.authenticateAdmin, submissionsController_1.updateSubmission);
exports.default = router;
//# sourceMappingURL=submissions.routes.js.map
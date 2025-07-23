"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateAdmin = void 0;
const auth_1 = require("../utils/auth");
const authenticateAdmin = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({ error: 'Access token required' });
            return;
        }
        const token = authHeader.substring(7); // Remove 'Bearer ' prefix
        const decoded = (0, auth_1.verifyToken)(token);
        req.admin = decoded;
        next();
    }
    catch (error) {
        console.error('Authentication error:', error);
        res.status(401).json({ error: 'Invalid or expired token' });
    }
};
exports.authenticateAdmin = authenticateAdmin;
//# sourceMappingURL=auth.js.map
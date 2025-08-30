"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadToLocal = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
// Create uploads directory if it doesn't exist
const uploadsDir = path_1.default.join(__dirname, '../../uploads');
if (!fs_1.default.existsSync(uploadsDir)) {
    fs_1.default.mkdirSync(uploadsDir, { recursive: true });
}
const uploadToLocal = async (file) => {
    const fileName = `${Date.now()}-${file.originalname}`;
    const filePath = path_1.default.join(uploadsDir, fileName);
    // Write file to disk
    await fs_1.default.promises.writeFile(filePath, file.buffer);
    // Return a URL that can be accessed through our API
    return `/uploads/${fileName}`;
};
exports.uploadToLocal = uploadToLocal;

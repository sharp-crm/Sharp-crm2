import fs from 'fs';
import path from 'path';

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

export const uploadToLocal = async (file: Express.Multer.File): Promise<string> => {
  const fileName = `${Date.now()}-${file.originalname}`;
  const filePath = path.join(uploadsDir, fileName);
  
  // Write file to disk
  await fs.promises.writeFile(filePath, file.buffer);
  
  // Return a URL that can be accessed through our API
  return `/uploads/${fileName}`;
}; 
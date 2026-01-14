import jwt from "jsonwebtoken";

export const authenticateToken = (req: any, res: any, next: any) => {
  if (!process.env.JWT_SECRET) {
    console.error("CRITICAL: JWT_SECRET is not defined.");
    return res.status(500).json({ message: "Server configuration error" });
  }
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: "Authentication required" });
  jwt.verify(token, process.env.JWT_SECRET, (err: any, user: any) => {
    if (err) return res.status(403).json({ message: "Invalid or expired token" });
    req.user = user;
    next();
  });
};

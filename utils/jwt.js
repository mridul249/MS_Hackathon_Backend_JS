import jwt from 'jsonwebtoken';
const jwtSecret = process.env.JWT_SECRET;

export function generateToken(payload) {
    return jwt.sign(payload, jwtSecret);
}

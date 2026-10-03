import {randomInt} from "node:crypto";

// 6-digit verification code, uniformly random across 100000–999999.
// (The previous version used Math.random() and only produced 100000–189999,
// i.e. ~90k possible codes, which made guessing far easier.)
export const generateToken = () => String(randomInt(100000, 1000000));

import jwt from "jsonwebtoken";

export const genJwTok = (res, userId) => {
  const token = jwt.sign({userId}, process.env.WEBTOKEN, {
    expiresIn: "7d",
  });

  const isProduction = process.env.NODE_ENV === "production";

  res.cookie("token", token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
  });
  // res.cookie('token', token, {
  // 	httpOnly: true,
  // 	secure: process.env.NODE_ENV === 'production',
  // 	sameSite: 'none',
  // });

  return token;
};

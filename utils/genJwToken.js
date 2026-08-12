import jwt from "jsonwebtoken";

export const genJwTok = (res, userId) => {
  const token = jwt.sign({userId}, process.env.WEBTOKEN, {
    expiresIn: "7d",
  });

  const isProduction = process.env.NODE_ENV === "production";
  // DEV SETTINGS
  res.cookie("token", token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
  });

  //PRODUCTION SETTINGS
  // res.cookie("token", token, {
  //   httpOnly: true,
  //   secure: isProduction,
  //   sameSite: isProduction ? "strict" : "lax",
  //   maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
  //   path: "/",
  // });

  return token;
};

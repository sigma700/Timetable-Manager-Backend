//here is where we perform all the logical for designing all the endpoints

import {User} from "../database/model/users.js";
import bcrypt from "bcrypt";
import {genJwTok} from "../../utils/genJwToken.js";
import {generateToken} from "../../utils/genToken.js";
import {School} from "../database/model/school.js";
import {sendError, sendSucess} from "../../utils/sendError.js";
import {trackActivity} from "../../service/activityService.js";
import {createAuditLog} from "../../service/auditService.js";
// import { sendVerMail, senWelMail } from '../../resend/sendEmail.js';

export const createTeacher = async (req, res) => {
  //lets enumerate the sign up
  // const { school } = req.params;
  const {firstName, lastName, password, email, contacts} = req.body;
  try {
    if (!email || !password) {
      return sendError(res, "Please fill out the required areas !");
    }

    const hashedPass = await bcrypt.hash(password, 12);
    const verToken = generateToken();

    //creation of the user
    const teacher = await User.create({
      firstName,
      lastName,
      email,
      password: hashedPass,
      // school,
      verToken,
      verTokenExpDate: Date.now() + 24 * 60 * 1000,
      contacts,
    });

    //set headers
    genJwTok(res, teacher._id);
    //lets send the email containing the cerification token that is required

    // await sendVerMail(teacher.verToken, teacher.email);
    //assignment
    teacher.isVerified = true;
    teacher.verToken = undefined; //token to dissapear for safety
    teacher.verTokenExpDate = undefined; //date to also dissapear lol

    trackActivity({
      event: "USER_REGISTERED",
      eventCategory: "AUTH",
      userId: teacher._id,
      schoolId: null,
      metadata: {
        entityId: teacher._id,
        entityName: `${teacher.firstName} ${teacher.lastName}`,
        entityEmail: teacher.email,
      },
    });

    createAuditLog({
      action: "USER_REGISTER",
      actionCategory: "AUTH",
      performedBy: teacher._id,
      targetId: teacher._id,
      targetModel: "User",
      previousValue: null,
      newValue: {
        firstName: teacher.firstName,
        lastName: teacher.lastName,
        email: teacher.email,
        accountType: teacher.accountType,
      },
      ipAddress: req.ip || req.headers["x-forwarded-for"] || null,
      userAgent: req.headers["user-agent"] || null,
      schoolId: null,
    });

    //send response
    sendSucess(res, "Successfully created new user !", teacher, 201);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "An error occured on our end !",
    });
    console.log(error);
  }
};

export const login = async (req, res) => {
  const {school} = req.params;
  const {email, password, firstName} = req.body;
  try {
    const alrExists = await User.findOne({email: email});
    if (!alrExists) {
      return sendError(
        res,
        "Oops looks like you do not have an account !",
        401,
      );
    }

    const passValid = await bcrypt.compare(password, alrExists.password);

    if (!passValid) {
      return sendError(res, "Incorrect password try again !", 401);
    }

    genJwTok(res, alrExists._id);

    trackActivity({
      event: "USER_LOGGED_IN",
      eventCategory: "AUTH",
      userId: alrExists._id,
      schoolId: alrExists.school || null,
      metadata: {
        entityId: alrExists._id,
        entityName: `${alrExists.firstName} ${alrExists.lastName}`,
        entityEmail: alrExists.email,
      },
    });

    createAuditLog({
      action: "USER_LOGIN",
      actionCategory: "AUTH",
      performedBy: alrExists._id,
      targetId: alrExists._id,
      targetModel: "User",
      previousValue: null,
      newValue: null,
      ipAddress: req.ip || req.headers["x-forwarded-for"] || null,
      userAgent: req.headers["user-agent"] || null,
      schoolId: alrExists.school || null,
    });

    return sendSucess(res, "Logged in !", alrExists, 200);
  } catch (error) {
    console.log(error);
    sendError(res, error.message);
  }
};

//lets add a verification area for more enhanced security

export const veriAcc = async (req, res) => {
  const {code} = req.body; //lets get the code from the user inputs

  if (!code) {
    return sendError(res, "Please have the code !");
  }

  try {
    //lets check if the person actually has the account

    const isExisting = await User.findOne({
      verToken: code,
      verTokenExpDate: {$gt: Date.now()},
    });
    if (!isExisting) {
      return sendError(res, "Code might be wrong or already expired !", 401);
    }

    //assignment
    isExisting.isVerified = true;
    isExisting.verToken = undefined; //token to dissapear for safety
    isExisting.verTokenExpDate = undefined; //date to also dissapear lol

    //save to the db
    await isExisting.save();

    trackActivity({
      event: "USER_EMAIL_VERIFIED",
      eventCategory: "AUTH",
      userId: isExisting._id,
      schoolId: isExisting.school || null,
      metadata: {
        entityId: isExisting._id,
        entityName: `${isExisting.firstName} ${isExisting.lastName}`,
        entityEmail: isExisting.email,
      },
    });

    createAuditLog({
      action: "USER_EMAIL_VERIFIED",
      actionCategory: "AUTH",
      performedBy: isExisting._id,
      targetId: isExisting._id,
      targetModel: "User",
      previousValue: {isVerified: false},
      newValue: {isVerified: true},
      ipAddress: req.ip || req.headers["x-forwarded-for"] || null,
      userAgent: req.headers["user-agent"] || null,
      schoolId: isExisting.school || null,
    });

    //TODO: Send a welcome email to the user after successfull verification here
    await senWelMail(isExisting.email, isExisting.firstName);

    sendSucess(res, "Verified !", isExisting, 200);
  } catch (error) {
    console.log(error); //i always add this for easier debugging of the code !
    sendError(res, error.message);
  }
};

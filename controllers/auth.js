const crypto = require('crypto');
const asyncHandler = require('../middleware/async');
const User = require('../models/User');
const sendEmail = require('../utils/sendEmail');
const ErrorResponse = require('../utils/errorResponse');
const {options} = require('../routes/auth');

//@desc     Register user
//@route    Post /api/v1/auth/register
//@access   Public
exports.register = asyncHandler(async (req, res, next) => {
  const {name, email, password, role} = req.body;

  //Create user
  const user = await User.create({
    name,
    email,
    password,
    role,
  });

  // Create token and send with cookie
  sendTokenResponse(user, 200, res);
});

//@desc     Login
//@route    Post /api/v1/auth/login
//@access   Public
exports.login = asyncHandler(async (req, res, next) => {
  const {email, password} = req.body;

  const user = await User.findOne({email}).select('+password');

  if (!user) {
    return next(new ErrorResponse('Invalid credentials', 401));
  }

  const isMatch = await user.matchPassword(password);

  if (!isMatch) {
    return next(new ErrorResponse('Invalid credentials', 401));
  }

  // Create token and send with cookie
  sendTokenResponse(user, 200, res);
});

//@desc     find current logged in user
//@route    Post /api/v1/auth/me
//@access   Private
exports.getMe = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id);

  res.status(200).json({
    success: true,
    data: user,
  });
});

//@desc     forgot password
//@route    Post /api/v1/auth/forgotpassword
//@access   Public
exports.forgotPassword = asyncHandler(async (req, res, next) => {
  const user = await User.findOne({email: req.body.email});

  if (!user) {
    return next(new ErrorResponse('There is no user with that email', 404));
  }

  // Get reset password token
  const resetToken = user.getResetPasswordToken();

  await user.save({validateBeforeSave: false});

  // Create reset url
  const resetUrl = `${req.protocol}://${req.get(
    'host'
  )}/api/v1/auth/resetpassword/${resetToken}`;

  const message = `You are receiving this message
   because you requested for a password reset. 
   please make a put request to this link: \n\n ${resetUrl}`;

  try {
    await sendEmail({
      email: user.email,
      subject: 'Password reset token',
      message,
    });

    res.status(200).json({
      success: true,
      data: 'Email sent',
    });
  } catch (err) {
    console.log(err);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpired = undefined;

    await user.save({
      validateBeforeSave: false,
    });

    return next(new ErrorResponse('Email could not be sent ', 500));
  }

  res.status(200).json({
    success: true,
    data: user,
  });
});

//@desc     Reset password
//@route    PUT /api/v1/auth/resetpassword/:resettoken
//@access   Public
exports.resetPassword = asyncHandler(async (req, res, next) => {
  // Get hashed token
  const resetPasswordToken = crypto
    .createHash('sha256')
    .update(req.params.resettoken)
    .digest('hex');

  const user = await User.findOne({
    resetPasswordToken,
    resetPasswordExpired: {$gt: Date.now()},
  });

  if (!user) {
    return next(new ErrorResponse('Invalid token', 400));
  }

  // Set new password
  user.password = req.body.password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpired = undefined;
  await user.save();

  // Create token and send with cookie
  sendTokenResponse(user, 200, res);
});

//@desc     Update user details
//@route    Put /api/v1/auth/updatedetails
//@access   Private
exports.updateDetails = asyncHandler(async (req, res, next) => {
  const fieldsToUpdate = {
    name: req.body.name,
    email: req.body.email,
  };

  const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    success: true,
    data: user,
  });
});

//@desc     Update logged in user password
//@route    Put /api/v1/auth/updatepassword
//@access   Private
exports.updatePassword = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id).select('+password');

  // Check current password
  if (!(await user.matchPassword(req.body.currentPassword))) {
    return next(new ErrorResponse('Passwords is incorrect', 401));
  }

  user.password = req.body.newPassword;

  await user.save();

  sendTokenResponse(user, 200, res);
});

// Get token from model, create cookie and send response
const sendTokenResponse = (user, statusCode, res) => {
  // Create token
  const token = user.getSignedJwtToken();

  const options = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000
    ),
    httOnly: true,
  };

  if (process.env.NODE_ENV === 'production') {
    options.secure = true;
  }

  res.status(statusCode).cookie('token', token, options).json({
    success: true,
    token,
  });
};

const path = require('path');
const asyncHandler = require('../middleware/async');
const Bootcamp = require('../models/Bootcamp');
const ErrorResponse = require('../utils/errorResponse');

//@desc     Get all bootcampers
//@route    Get /api/v1/bootcamps
//@access   Public
exports.getBootcamps = asyncHandler(async (req, res, next) => {
  res.status(200).json(res.advancedResults);
});

//@desc     Get single bootcamper
//@route    Get /api/v1/bootcamps/:id
//@access   Public
exports.getBootcamp = asyncHandler(async (req, res, next) => {
  const bootcamp = await Bootcamp.findById(req.params.id);

  if (!bootcamp) {
    return next(error);
  }
  res.status(200).json({
    success: true,
    count: bootcamp.length,

    data: bootcamp,
  });
});

//@desc     Create new bootcamper
//@route    POST /api/v1/bootcamps
//@access   Private
exports.createBootcamp = asyncHandler(async (req, res, next) => {
  // Add user to req.body
  req.body.user = req.user.id;

  // Check for published bootcamp
  const publishedBootcamp = await Bootcamp.findOne({ user: req.user.id });

  // if the user is not an admin they can only add one bootcamp
  if (publishedBootcamp && req.user.role !== 'admin') {
    return next(
      new ErrorResponse(
        `The user with the ID ${req.user.id} has already published a bootcamp`,
        400
      )
    );
  }

  const bootcamp = await Bootcamp.create(req.body);

  res.status(200).json({
    success: true,
    count: bootcamp.length,
    data: bootcamp,
  });
});

//@desc     Update bootcamper
//@route    PUT /api/v1/bootcamps/:id
//@access   Private
exports.updateBootcamp = asyncHandler(async (req, res, next) => {
  let bootcamp = await Bootcamp.findById(req.params.id);
  if (!bootcamp) {
    return next(new ErrorResponse('unable to update bootcamp', 500));
  }

  //make sure user is the owner of the boot camp to update
  if (bootcamp.user.toString() !== req.user.id && req.user.role != 'admin') {
    return next(
      new ErrorResponse(
        `${req.user.id} is not authorize to access to authoirze to update this bootcamp`,
        401
      )
    );
  }

  bootcamp = await Bootcamp.findOneAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    success: true,
    count: bootcamp.length,
    data: bootcamp,
  });
});

//@desc     Delete all bootcampers
//@route    Delete /api/v1/bootcamps/:id
//@access   Private
exports.deleteBootcamp = asyncHandler(async (req, res, next) => {
  const bootcamp = await Bootcamp.findById(req.params.id);

  if (!bootcamp) {
    return next(error);
  }

  //make sure user is the owner of the boot camp to update
  if (bootcamp.user.toString() !== req.user.id && req.user.role != 'admin') {
    return next(
      new ErrorResponse(
        `${req.user.id} is not authorize to access to authoirze to delete this bootcamp`,
        401
      )
    );
  }

  bootcamp.remove();

  res.status(200).json({
    success: true,
    count: bootcamp.length,
    data: {},
  });
});

//@desc     Upload photo for bootcamper
//@route    Delete /api/v1/bootcamps/:id/photo
//@access   Private
exports.bootcampPhotoUpload = asyncHandler(async (req, res, next) => {
  let bootcamp = await Bootcamp.findById(req.params.id);

  if (!bootcamp) {
    return next(error);
  }

  //make sure user is the owner of the boot camp to update
  if (bootcamp.user.toString() !== req.user.id && req.user.role != 'admin') {
    return next(
      new ErrorResponse(
        `${req.user.id} is not authorize to access to authoirze to delete this bootcamp`,
        401
      )
    );
  }

  if (!req.files) {
    return next(new ErrorResponse('Please upload a file', 400));
  }

  const file = req.files.file;

  // Make sure the image is a photo
  if (!file.mimetype.startsWith('image')) {
    return next(new ErrorResponse('Please upload an image file', 400));
  }

  // Check filesize
  if (file.size > process.env.MAX_FILE_UPLOAD) {
    return next(
      new ErrorResponse(
        `Please upload an image file less than ${process.env.MAX_FILE_UPLOAD}`,
        400
      )
    );
  }

  // Create custom filename
  file.name = `photo_${bootcamp._id}${path.parse(file.name).ext}`;

  file.mv(`${process.env.FILE_UPLOAD_PATH}/${file.name}`, async (err) => {
    if (err) {
      console.log(err);
      return next(new ErrorResponse(`Problem with file upload`, 500));
    }

    await Bootcamp.findByIdAndUpdate(req.params.id, { photo: file.name });

    res.status(200).json({
      success: true,
      data: file.name,
    });
  });
});

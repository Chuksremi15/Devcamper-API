const asyncHandler = require('../middleware/async');
const Course = require('../models/Course');
const ErrorResponse = require('../utils/errorResponse');
const Bootcamp = require('../models/Bootcamp');

//@desc    Get all course
//@route   Get /api/vi/courses
//@route   Get /api/v1/bootcamps/:bootcampId/courses
//@access  public
exports.getCourses = asyncHandler(async (req, res, next) => {
  if (req.params.bootcampId) {
    courses = await Course.find({ bootcamp: req.params.bootcampId });

    return res
      .status(200)
      .json({ success: true, count: courses.length, data: courses });
  } else {
    res.status(200).json(res.advancedResults);
  }
});

//@desc    Get single course
//@route   Get api/v1/courses/:Id
//@access  private
exports.getCourse = asyncHandler(async (req, res, next) => {
  const course = await Course.findById(req.params.id).populate({
    path: 'bootcamp',
    select: 'name description',
  });

  if (!course) {
    return next(
      new ErrorResponse(`course with the id of ${req.param.id} not found`, 404)
    );
  }

  res.status(200).json({ success: true, data: course });
});

//@desc    Create new course
//@route   Post /api/v1/bootcamps/:bootcampId/courses
//@access  private
exports.addCourse = asyncHandler(async (req, res, next) => {
  req.body.bootcamp = req.params.bootcampId;
  req.body.user = req.user.id;

  const bootcamp = await Bootcamp.findById(req.params.bootcampId);

  if (!bootcamp) {
    return next(
      new ErrorResponse(`No Bootcamp with the id of ${req.params.id}`, 404)
    );
  }

  //make sure user is the owner of the bootcamp that adds course
  if (bootcamp.user.toString() !== req.user.id && req.user.role != 'admin') {
    return next(
      new ErrorResponse(
        `${req.user.id} is not authorize to access to add a course to ${bootcamp._id}`,
        401
      )
    );
  }

  const course = await Course.create(req.body);

  res.status(200).json({ success: true, data: course });
});

//@desc    Update course
//@route   Create /api/v1/courses/:id
//@access  private
exports.updateCourse = asyncHandler(async (req, res, next) => {
  let course = await Course.findById(req.params.id);

  if (!course) {
    return next(
      new ErrorResponse(
        `No course with the id of ${req.params.id} attached to bootcamp`,
        404
      )
    );
  }

  //make sure user is the owner of the course that can update course
  if (course.user.toString() !== req.user.id && req.user.role != 'admin') {
    return next(
      new ErrorResponse(
        `${req.user.id} is not authorize update course in ${bootcamp._id}`,
        401
      )
    );
  }

  course = await Course.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({ success: true, data: course });
});

//@desc    delete course
//@route   delete /api/v1/courses/:id
//@access  private
exports.deleteCourse = asyncHandler(async (req, res, next) => {
  let course = await Course.findById(req.params.id);

  if (!course) {
    return next(
      new ErrorResponse(
        `No course with the id of ${req.params.id} attached to bootcamp`,
        404
      )
    );
  }

  //make sure user is the owner of the course to delete
  if (course.user.toString() !== req.user.id && req.user.role != 'admin') {
    return next(
      new ErrorResponse(
        `${req.user.id} is not authorize delete course in ${bootcamp._id}`,
        401
      )
    );
  }

  await Course.findByIdAndDelete(req.params.id);

  res.status(200).json({ success: true, data: {} });
});

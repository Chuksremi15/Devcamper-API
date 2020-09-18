const express = require('express');

const Course = require('../models/Course');
const advanceResults = require('../middleware/advancedResults');
const { protect, authorize } = require('../middleware/auth');

const {
  getCourses,
  getCourse,
  addCourse,
  updateCourse,
  deleteCourse,
} = require('../controllers/courses');

const router = express.Router({ mergeParams: true });

router
  .route('/')
  .get(advanceResults(Course, 'bootcamp'), getCourses)
  .post(protect, addCourse);

router
  .route('/:id')
  .get(getCourse)
  .put(protect, authorize('publisher', 'admin'), updateCourse)
  .delete(protect, authorize('publisher', 'admin'), deleteCourse);

module.exports = router;

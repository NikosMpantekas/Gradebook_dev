const Class = require('../models/classModel');
const Subject = require('../models/subjectModel');

async function gradeReadScope(user) {
  switch (user.role) {
    case 'student':
      return { student: user._id };
    case 'parent':
      return { student: { $in: user.linkedStudentIds || [] } };
    case 'teacher': {
      const classes = await Class.find({ schoolId: user.schoolId, teachers: user._id })
        .select('subject students').lean();
      const subjects = await Subject.find({
        schoolId: user.schoolId,
        name: { $in: classes.map(cls => cls.subject) }
      }).select('name').lean();
      const subjectIds = new Map(subjects.map(subject => [subject.name, subject._id]));
      const assignments = classes.filter(cls => subjectIds.has(cls.subject)).map(cls => ({
        student: { $in: cls.students }, subject: subjectIds.get(cls.subject)
      }));
      return assignments.length ? { $or: assignments } : { _id: { $in: [] } };
    }
    case 'admin':
    case 'superadmin':
    case 'secretary':
      return {};
    default:
      return { _id: { $in: [] } };
  }
}

module.exports = gradeReadScope;

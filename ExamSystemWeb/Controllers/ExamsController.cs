using ExamSystemApplication.Interfaces.Services;
using ExamSystemDomain.Entities;
using ExamSystemDomain.Enums;
using ExamSystemWeb.ViewModels;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;

namespace ExamSystemWeb.Controllers
{
    public class ExamsController : Controller
    {
        private readonly IExamService _examService;
        private readonly IStudentService _studentService;
        private readonly ISubjectService _subjectService;

        public ExamsController(
            IExamService examService,
            IStudentService studentService,
            ISubjectService subjectService)
        {
            _examService = examService;
            _studentService = studentService;
            _subjectService = subjectService;
        }

        public async Task<IActionResult> Index()
        {
            var exams = await _examService.GetAllAsync();

            var model = exams.Select(e => new ExamListViewModel
            {
                Id = e.Id,
                StudentName = $"{e.Student.FirstName} {e.Student.LastName}",
                SubjectName = e.Subject.SubjectName,
                ExamDate = e.ExamDate,
                Score = e.Score
            }).ToList();

            return View(model);
        }


        public async Task<IActionResult> Create()
        {
            var model = new ExamCreateViewModel
            {
                Students = await GetStudentsAsync(),
                Subjects = new List<SelectListItem>() 
            };

            return View(model);
        }


        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Create(ExamCreateViewModel model)
        {
            if (!ModelState.IsValid)
            {
                model.Students = await GetStudentsAsync();

                var student = await _studentService.GetByIdAsync(model.StudentId);
                if (student != null)
                {
                    model.Subjects = await GetSubjectsAsync(student.Grade);
                }
                else
                {
                    model.Subjects = new List<SelectListItem>();
                }

                return View(model);
            }

            var exam = new Exam
            {
                StudentId = model.StudentId,
                SubjectId = model.SubjectId,
                ExamDate = model.ExamDate,
                Score = model.Score
            };

            await _examService.CreateAsync(exam);
            return RedirectToAction(nameof(Index));
        }



        public async Task<IActionResult> Edit(int id)
        {
            var exam = await _examService.GetByIdAsync(id);
            if (exam == null)
                return NotFound();

            var student = await _studentService.GetByIdAsync(exam.StudentId);
            if (student == null)
                return NotFound();

            var model = new ExamEditViewModel
            {
                Id = exam.Id,
                StudentId = exam.StudentId,
                SubjectId = exam.SubjectId,
                ExamDate = exam.ExamDate,
                Score = exam.Score,

                Students = await GetStudentsAsync(),

                Subjects = await GetSubjectsAsync(student.Grade)
            };

            return View(model);
        }


        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Edit(ExamEditViewModel model)
        {
            if (!ModelState.IsValid)
            {
                model.Students = await GetStudentsAsync();

               
                var student = await _studentService.GetByIdAsync(model.StudentId);
                if (student != null)
                {
                    model.Subjects = await GetSubjectsAsync(student.Grade); 
                }
                else
                {
                    model.Subjects = new List<SelectListItem>();
                }

                return View(model);
            }

            var exam = new Exam
            {
                Id = model.Id,
                StudentId = model.StudentId,
                SubjectId = model.SubjectId,
                ExamDate = model.ExamDate,
                Score = model.Score
            };

            await _examService.UpdateAsync(exam);
            return RedirectToAction(nameof(Index));
        }



        public async Task<IActionResult> Delete(int id)
        {
            await _examService.DeleteAsync(id);
            return RedirectToAction(nameof(Index));
        }

       
        private async Task<List<SelectListItem>> GetStudentsAsync()
        {
            var students = await _studentService.GetAllAsync();
            return students.Select(s => new SelectListItem
            {
                Value = s.Id.ToString(),
                Text = $"{s.FirstName} {s.LastName}"
            }).ToList();
        }

        private async Task<List<SelectListItem>> GetSubjectsAsync(Grade grade)
        {
            var subjects = await _subjectService.GetByGradeAsync(grade);

            return subjects
                .OrderBy(s => s.SubjectName)
                .Select(s => new SelectListItem
                {
                    Value = s.Id.ToString(),
                    Text = $"{s.SubjectName} – {(int)s.Grade}-ci sinif"
                })
                .ToList();
        }


        [HttpGet]
        public async Task<IActionResult> GetSubjectsByStudent(int studentId)
        {
            if (studentId <= 0)
                return Json(new List<object>());

            var student = await _studentService.GetByIdAsync(studentId);
            if (student == null)
                return Json(new List<object>());

            var subjects = await _subjectService.GetByGradeAsync(student.Grade);

            return Json(subjects.Select(s => new
            {
                id = s.Id,
                name = $"{s.SubjectName} – {(int)s.Grade}-ci sinif"
            }));
        }

    }
}

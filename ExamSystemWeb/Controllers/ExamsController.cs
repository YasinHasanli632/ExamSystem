using ExamSystemApplication.Interfaces.Services;
using ExamSystemDomain.Entities;
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

        // =========================
        // LIST
        // =========================
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

        // =========================
        // CREATE
        // =========================
        public async Task<IActionResult> Create()
        {
            var model = new ExamCreateViewModel
            {
                Students = await GetStudentsAsync(),
                Subjects = await GetSubjectsAsync()
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
                model.Subjects = await GetSubjectsAsync();
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

        // =========================
        // EDIT
        // =========================
        public async Task<IActionResult> Edit(int id)
        {
            var exam = await _examService.GetByIdAsync(id);

            var model = new ExamEditViewModel
            {
                Id = exam.Id,
                StudentId = exam.StudentId,
                SubjectId = exam.SubjectId,
                ExamDate = exam.ExamDate,
                Score = exam.Score,
                Students = await GetStudentsAsync(),
                Subjects = await GetSubjectsAsync()
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
                model.Subjects = await GetSubjectsAsync();
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

        // =========================
        // DELETE
        // =========================
        public async Task<IActionResult> Delete(int id)
        {
            await _examService.DeleteAsync(id);
            return RedirectToAction(nameof(Index));
        }

        // =========================
        // Helpers
        // =========================
        private async Task<List<SelectListItem>> GetStudentsAsync()
        {
            var students = await _studentService.GetAllAsync();
            return students.Select(s => new SelectListItem
            {
                Value = s.Id.ToString(),
                Text = $"{s.FirstName} {s.LastName}"
            }).ToList();
        }

        private async Task<List<SelectListItem>> GetSubjectsAsync()
        {
            var subjects = await _subjectService.GetAllAsync();

            return subjects
                .OrderBy(s => s.SubjectName)
                .ThenBy(s => s.Grade)
                .Select(s => new SelectListItem
                {
                    Value = s.Id.ToString(),
                    Text = $"{s.SubjectName} – {(int)s.Grade}-ci sinif"
                })
                .ToList();
        }

    }
}

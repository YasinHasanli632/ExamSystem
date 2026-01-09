using ExamSystemApplication.Interfaces.Services;
using ExamSystemApplication.Services.ExamSystemApplication.Services;
using ExamSystemDomain.Entities;
using ExamSystemWeb.ViewModels;
using Microsoft.AspNetCore.Mvc;

namespace ExamSystemWeb.Controllers
{
    
        public class StudentsController : Controller
        {
            private readonly IStudentService _studentService;
            private readonly IExamService _examService;
            public StudentsController(IStudentService studentService,IExamService examservice)
            {
                _studentService = studentService;
                _examService = examservice;
            }

        // =========================
        // LIST
        // =========================
        public async Task<IActionResult> Index()
        {
            var students = await _studentService.GetAllAsync();

            var model = students.Select(s => new StudentListViewModel
            {
                Id = s.Id,
                StudentNumber = s.StudentNumber,
                FullName = $"{s.FirstName} {s.LastName}",
                Grade = s.Grade
            }).ToList();

            return View(model);
        }

        public async Task<IActionResult> Details(int id)
        {
            var student = await _studentService.GetByIdAsync(id);
            var exams = await _examService.GetByStudentIdAsync(id);

            var model = new StudentDetailsViewModel
            {
                Id = student.Id,
                StudentNumber = student.StudentNumber,
                FullName = $"{student.FirstName} {student.LastName}",
                Grade = student.Grade,

                Exams = exams.Select(e => new StudentExamItemViewModel
                {
                    ExamId = e.Id,
                    SubjectName = e.Subject.SubjectName,
                    ExamDate = e.ExamDate,
                    Score = e.Score
                }).ToList()
            };

            return View(model);
        }


        // =========================
        // CREATE
        // =========================
        public IActionResult Create()
            {
                return View();
            }

            [HttpPost]
            [ValidateAntiForgeryToken]
            public async Task<IActionResult> Create(StudentCreateViewModel model)
            {
                if (!ModelState.IsValid)
                    return View(model);

                var student = new Student
                {
                    
                    FirstName = model.FirstName,
                    LastName = model.LastName,
                    Grade = model.Grade
                };

                await _studentService.CreateAsync(student);
                return RedirectToAction(nameof(Index));
            }

            // =========================
            // EDIT
            // =========================
            public async Task<IActionResult> Edit(int id)
            {
                var student = await _studentService.GetByIdAsync(id);

                var model = new StudentEditViewModel
                {
                    Id = student.Id,
                    StudentNumber = student.StudentNumber,
                    FirstName = student.FirstName,
                    LastName = student.LastName,
                    Grade = student.Grade
                };

                return View(model);
            }

            [HttpPost]
            [ValidateAntiForgeryToken]
        [HttpPost]
        public async Task<IActionResult> Edit(StudentEditViewModel model)
        {
            if (!ModelState.IsValid)
                return View(model);

            try
            {
                var student = new Student
                {
                    Id = model.Id,
                    StudentNumber = model.StudentNumber,
                    FirstName = model.FirstName,
                    LastName = model.LastName,
                    Grade = model.Grade
                };

                await _studentService.UpdateAsync(student);
                return RedirectToAction(nameof(Index));
            }
            catch (InvalidOperationException ex)
            {
                // Business error → form error
                ModelState.AddModelError(nameof(model.StudentNumber), ex.Message);
                return View(model);
            }
        }


        // =========================
        // DELETE
        // =========================
        public async Task<IActionResult> Delete(int id)
            {
                await _studentService.DeleteAsync(id);
                return RedirectToAction(nameof(Index));
            }
        }
    }


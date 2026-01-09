using ExamSystemApplication.Interfaces.Services;
using ExamSystemDomain.Entities;
using ExamSystemWeb.ViewModels;
using Microsoft.AspNetCore.Mvc;

namespace ExamSystemWeb.Controllers
{
    public class SubjectsController : Controller
    {
        private readonly ISubjectService _subjectService;

        public SubjectsController(ISubjectService subjectService)
        {
            _subjectService = subjectService;
        }

        public async Task<IActionResult> Index()
        {
            var subjects = await _subjectService.GetAllAsync();

            var model = subjects.Select(s => new SubjectListViewModel
            {
                Id = s.Id,
                SubjectCode = s.SubjectCode,
                SubjectName = s.SubjectName,
                Grade = s.Grade,
                TeacherFullName = $"{s.TeacherFirstName} {s.TeacherLastName}"
            }).ToList();

            return View(model);
        }

      
        public IActionResult Create()
        {
            return View();
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Create(SubjectCreateViewModel model)
        {
            if (!ModelState.IsValid)
                return View(model);

            var subject = new Subject
            {
                
                SubjectName = model.SubjectName,
                Grade = model.Grade,
                TeacherFirstName = model.TeacherFirstName,
                TeacherLastName = model.TeacherLastName
            };

            await _subjectService.CreateAsync(subject);
            return RedirectToAction(nameof(Index));
        }

      
        public async Task<IActionResult> Edit(int id)
        {
            var subject = await _subjectService.GetByIdAsync(id);

            var model = new SubjectEditViewModel
            {
                Id = subject.Id,
                SubjectCode = subject.SubjectCode,

                SubjectName = subject.SubjectName,
                Grade = subject.Grade,
                TeacherFirstName = subject.TeacherFirstName,
                TeacherLastName = subject.TeacherLastName
            };

            return View(model);
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Edit(SubjectEditViewModel model)
        {
            if (!ModelState.IsValid)
                return View(model);

            var subject = new Subject
            {
                Id = model.Id,
                SubjectCode = model.SubjectCode,
                SubjectName = model.SubjectName,
                Grade = model.Grade,
                TeacherFirstName = model.TeacherFirstName,
                TeacherLastName = model.TeacherLastName
            };

            await _subjectService.UpdateAsync(subject);
            return RedirectToAction(nameof(Index));
        }

     
        public async Task<IActionResult> Delete(int id)
        {
            await _subjectService.DeleteAsync(id);
            return RedirectToAction(nameof(Index));
        }
    }
}

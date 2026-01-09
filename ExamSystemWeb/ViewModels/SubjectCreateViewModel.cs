using ExamSystemDomain.Enums;
using System.ComponentModel.DataAnnotations;

namespace ExamSystemWeb.ViewModels
{
    public class SubjectCreateViewModel
    {
        public string? SubjectCode { get; set; } = null!;

        [Required]
        public string SubjectName { get; set; } = null!;

        [Required]
        [Range(1,11)]
        public Grade Grade { get; set; }

        [Required]
        public string TeacherFirstName { get; set; } = null!;

        [Required]
        public string TeacherLastName { get; set; } = null!;
    }
}


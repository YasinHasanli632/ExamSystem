using ExamSystemDomain.Enums;
using System.ComponentModel.DataAnnotations;

namespace ExamSystemWeb.ViewModels
{
    public class SubjectEditViewModel
    {
        public int Id { get; set; }

        [Required]
        public string SubjectCode { get; set; } = null!;

        [Required]
        public string SubjectName { get; set; } = null!;

        [Required]
        public Grade Grade { get; set; }

        [Required]
        public string TeacherFirstName { get; set; } = null!;

        [Required]
        public string TeacherLastName { get; set; } = null!;
    }

}

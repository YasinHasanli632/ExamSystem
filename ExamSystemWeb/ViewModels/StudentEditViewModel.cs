using ExamSystemDomain.Enums;
using System.ComponentModel.DataAnnotations;

namespace ExamSystemWeb.ViewModels
{
    public class StudentEditViewModel
    {
        public int Id { get; set; }

        [Required]
        public int StudentNumber { get; set; }

        [Required]
        public string FirstName { get; set; } = null!;

        [Required]
        public string LastName { get; set; } = null!;

        [Required]
        public Grade Grade { get; set; }
    }
}

using ExamSystemDomain.Enums;
using System.ComponentModel.DataAnnotations;

namespace ExamSystemWeb.ViewModels
{
    public class StudentCreateViewModel
    {
        

        [Required]
        public string FirstName { get; set; } = null!;

        [Required]
        public string LastName { get; set; } = null!;

        [Required]
        public Grade Grade { get; set; }
    }
}

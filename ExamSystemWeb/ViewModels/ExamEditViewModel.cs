using Microsoft.AspNetCore.Mvc.Rendering;
using System.ComponentModel.DataAnnotations;

namespace ExamSystemWeb.ViewModels
{
    public class ExamEditViewModel
    {
        public int Id { get; set; }

        [Required]
        public int StudentId { get; set; }

        [Required]
        public int SubjectId { get; set; }

        [Required]
        public DateTime ExamDate { get; set; }

        [Range(1, 9)]
        public int Score { get; set; }

        public List<SelectListItem> Students { get; set; } = new();
        public List<SelectListItem> Subjects { get; set; } = new();
    }
}

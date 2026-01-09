using ExamSystemDomain.Enums;

namespace ExamSystemWeb.ViewModels
{
    public class StudentDetailsViewModel
    {
        public int Id { get; set; }
        public int StudentNumber { get; set; }
        public string FullName { get; set; } = null!;
        public Grade Grade { get; set; }

        public List<StudentExamItemViewModel> Exams { get; set; } = new();

       
        public string StudentNumberDisplay
            => $"STD-{StudentNumber:D4}";
    }
}

using ExamSystemDomain.Enums;

namespace ExamSystemWeb.ViewModels
{
    public class StudentListViewModel
    {
        public int Id { get; set; }

        // BU LAZIMDIR
        public int StudentNumber { get; set; }

        public string StudentNumberDisplay
            => $"STD-{StudentNumber}";

        public string FullName { get; set; } = null!;
        public Grade Grade { get; set; }
    }

}

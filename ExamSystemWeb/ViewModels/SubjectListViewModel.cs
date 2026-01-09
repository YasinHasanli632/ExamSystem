using ExamSystemDomain.Enums;

namespace ExamSystemWeb.ViewModels
{
    public class SubjectListViewModel
    {
        public int Id { get; set; }
        public string SubjectCode { get; set; } = null!;
        public string SubjectName { get; set; } = null!;
        public Grade Grade { get; set; }
        public string TeacherFullName { get; set; } = null!;
    }
}

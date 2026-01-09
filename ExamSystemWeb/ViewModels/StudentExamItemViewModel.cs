namespace ExamSystemWeb.ViewModels
{
    public class StudentExamItemViewModel
    {
        public int ExamId { get; set; }
        public string SubjectName { get; set; } = null!;
        public DateTime ExamDate { get; set; }
        public int Score { get; set; }
    }
}

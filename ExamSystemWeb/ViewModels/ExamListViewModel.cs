namespace ExamSystemWeb.ViewModels
{
    public class ExamListViewModel
    {
        public int Id { get; set; }

        public string StudentName { get; set; } = null!;
        public string SubjectName { get; set; } = null!;

        public DateTime ExamDate { get; set; }
        public int Score { get; set; }
    }
}

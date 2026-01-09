using ExamSystemDomain.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ExamSystemApplication.Interfaces.Repositories
{
    public interface IExamRepository
    {
        Task AddAsync(Exam exam);
        Task<Exam?> GetByIdAsync(int id);

        Task<IReadOnlyList<Exam>> GetAllAsync();
        Task<IReadOnlyList<Exam>> GetAllWithDetailsAsync();

        Task<IReadOnlyList<Exam>> GetByStudentIdAsync(int studentId);
        Task<IReadOnlyList<Exam>> GetBySubjectIdAsync(int subjectId);
        Task<bool> HasExamsAsync(int subjectId);
        Task<bool> ExistsSameDayAsync(
            int studentId,
            int subjectId,
            DateTime examDate,
            int excludeExamId);

        Task UpdateAsync(Exam exam);
        Task DeleteAsync(Exam exam);
    }


}

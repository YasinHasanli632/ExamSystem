using ExamSystemDomain.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ExamSystemApplication.Interfaces.Services
{
    public interface IExamService
    {
        // Create
        Task<Exam> CreateAsync(Exam exam);

        // Read
        Task<Exam> GetByIdAsync(int id);
        Task<IReadOnlyList<Exam>> GetAllAsync();
        Task<IReadOnlyList<Exam>> GetByStudentIdAsync(int studentId);
        Task<IReadOnlyList<Exam>> GetBySubjectIdAsync(int subjectId);

        // Update
        Task UpdateAsync(Exam exam);

        // Delete
        Task DeleteAsync(int id);
    }
}

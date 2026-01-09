using ExamSystemDomain.Entities;
using ExamSystemDomain.Enums;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ExamSystemApplication.Interfaces.Services
{
    public interface ISubjectService
    {
        // Create
        Task<Subject> CreateAsync(Subject subject);

        // Read
        Task<Subject> GetByIdAsync(int id);
        Task<Subject> GetByCodeAsync(string subjectCode);
        Task<IReadOnlyList<Subject>> GetAllAsync();
        Task<IReadOnlyList<Subject>> GetByGradeAsync(Grade grade);

        // Update
        Task UpdateAsync(Subject subject);

        // Delete
        Task DeleteAsync(int id);
    }
}

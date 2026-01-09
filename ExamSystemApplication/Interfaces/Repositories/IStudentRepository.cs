using ExamSystemDomain.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ExamSystemApplication.Interfaces.Repositories
{
    public interface IStudentRepository
    {
        // Create
        Task AddAsync(Student student);

        // Read
        Task<Student?> GetByIdAsync(int id);
        Task<Student?> GetByStudentNumberAsync(int studentNumber);
        Task<IReadOnlyList<Student>> GetAllAsync();

        // Update
        Task UpdateAsync(Student student);
        Task<int> GetNextStudentSequenceAsync();

        // Delete
        Task DeleteAsync(Student student);
    }
}

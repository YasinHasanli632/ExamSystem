using ExamSystemDomain.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ExamSystemApplication.Interfaces.Services
{
    public interface IStudentService
    {
        // Create
        Task<Student> CreateAsync(Student student);

        // Read
        Task<Student> GetByIdAsync(int id);
        Task<Student> GetByStudentNumberAsync(int studentNumber);
        Task<IReadOnlyList<Student>> GetAllAsync();

        // Update
        Task UpdateAsync(Student student);

        // Delete
        Task DeleteAsync(int id);
    }
}

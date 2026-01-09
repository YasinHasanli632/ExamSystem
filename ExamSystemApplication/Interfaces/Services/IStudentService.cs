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
       
        Task<Student> CreateAsync(Student student);

      
        Task<Student> GetByIdAsync(int id);
        Task<Student> GetByStudentNumberAsync(int studentNumber);
        Task<IReadOnlyList<Student>> GetAllAsync();

      
        Task UpdateAsync(Student student);

       
        Task DeleteAsync(int id);
    }
}

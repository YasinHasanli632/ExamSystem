using ExamSystemDomain.Entities;
using ExamSystemDomain.Enums;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ExamSystemApplication.Interfaces.Repositories
{
    public interface ISubjectRepository
    {
       
        Task AddAsync(Subject subject);

       
        Task<Subject?> GetByIdAsync(int id);
        Task<Subject?> GetByCodeAsync(string subjectCode);
        Task<IReadOnlyList<Subject>> GetAllAsync();
        Task<IReadOnlyList<Subject>> GetByGradeAsync(Grade grade);


      
        Task UpdateAsync(Subject subject);

     
        Task DeleteAsync(Subject subject);

    }
}

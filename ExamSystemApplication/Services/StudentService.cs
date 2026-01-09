using ExamSystemApplication.Interfaces.Repositories;
using ExamSystemApplication.Interfaces.Services;
using ExamSystemDomain.Entities;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ExamSystemApplication.Services
{
    public class StudentService : IStudentService
    {
        private readonly IStudentRepository _studentRepository;

        public StudentService(IStudentRepository studentRepository)
        {
            _studentRepository = studentRepository;
        }


        public async Task<Student> CreateAsync(Student student)
        {
            const int maxAttempts = 2;

            for (int attempt = 1; attempt <= maxAttempts; attempt++)
            {
                try
                {
                    student.StudentNumber =
                        await _studentRepository.GetNextStudentSequenceAsync();

                    await _studentRepository.AddAsync(student);

                    return student;
                }
                catch (DbUpdateException) when (attempt < maxAttempts)
                {
                    
                }
            }

            
            throw new InvalidOperationException(
                "Şagird nömrəsi yaradılarkən problem yarandı. Zəhmət olmasa yenidən cəhd edin.");
        }



        public async Task<Student> GetByIdAsync(int id)
        {
            var student = await _studentRepository.GetByIdAsync(id);

            if (student == null)
                throw new KeyNotFoundException("Şagird tapılmadı.");

            return student;
        }

        public async Task<Student> GetByStudentNumberAsync(int studentNumber)
        {
            var student =
                await _studentRepository.GetByStudentNumberAsync(studentNumber);

            if (student == null)
                throw new KeyNotFoundException("Şagird tapılmadı.");

            return student;
        }

        public async Task<IReadOnlyList<Student>> GetAllAsync()
        {
            return await _studentRepository.GetAllAsync();
        }

      
        public async Task UpdateAsync(Student student)
        {
            var existingStudent =
                await _studentRepository.GetByIdAsync(student.Id);

            if (existingStudent == null)
                throw new KeyNotFoundException("Yenilənəcək şagird tapılmadı.");

          
            student.StudentNumber = existingStudent.StudentNumber;

            await _studentRepository.UpdateAsync(student);
        }


       
        public async Task DeleteAsync(int id)
        {
            var student = await _studentRepository.GetByIdAsync(id);

            if (student == null)
                throw new KeyNotFoundException("Silinəcək şagird tapılmadı.");

            await _studentRepository.DeleteAsync(student);
        }
    }

}

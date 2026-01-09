using ExamSystemApplication.Interfaces.Repositories;
using ExamSystemApplication.Interfaces.Services;
using ExamSystemDomain.Entities;
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

        // =========================
        // Create
        // =========================
        public async Task<Student> CreateAsync(Student student)
        {
            // Avtomatik int StudentNumber
            student.StudentNumber =
                await _studentRepository.GetNextStudentSequenceAsync();

            await _studentRepository.AddAsync(student);
            return student;
        }

        // =========================
        // Read
        // =========================
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

        // =========================
        // Update
        // =========================
        public async Task UpdateAsync(Student student)
        {
            var existingStudent =
                await _studentRepository.GetByIdAsync(student.Id);

            if (existingStudent == null)
                throw new KeyNotFoundException("Yenilənəcək şagird tapılmadı.");

            // 🔒 StudentNumber dəyişməzdir
            student.StudentNumber = existingStudent.StudentNumber;

            await _studentRepository.UpdateAsync(student);
        }


        // =========================
        // Delete
        // =========================
        public async Task DeleteAsync(int id)
        {
            var student = await _studentRepository.GetByIdAsync(id);

            if (student == null)
                throw new KeyNotFoundException("Silinəcək şagird tapılmadı.");

            await _studentRepository.DeleteAsync(student);
        }
    }

}

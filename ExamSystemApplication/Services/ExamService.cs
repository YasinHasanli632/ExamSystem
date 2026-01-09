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
    
    using ExamSystemDomain.Entities;

    namespace ExamSystemApplication.Services
    {
        public class ExamService : IExamService
        {
            private readonly IExamRepository _examRepository;
            private readonly IStudentRepository _studentRepository;
            private readonly ISubjectRepository _subjectRepository;

            public ExamService(
                IExamRepository examRepository,
                IStudentRepository studentRepository,
                ISubjectRepository subjectRepository)
            {
                _examRepository = examRepository;
                _studentRepository = studentRepository;
                _subjectRepository = subjectRepository;
            }

            // =========================
            // CREATE
            // =========================
            public async Task<Exam> CreateAsync(Exam exam)
            {
                // Student yoxlanışı
                var student = await _studentRepository.GetByIdAsync(exam.StudentId);
                if (student == null)
                    throw new KeyNotFoundException("Şagird tapılmadı.");

                // Subject yoxlanışı
                var subject = await _subjectRepository.GetByIdAsync(exam.SubjectId);
                if (subject == null)
                    throw new KeyNotFoundException("Dərs tapılmadı.");

                // Score validation
                if (exam.Score < 1 || exam.Score > 9)
                    throw new InvalidOperationException("Qiymət 1 ilə 9 arasında olmalıdır.");

                // Eyni gün + eyni fənn yoxlaması
                var exists = await _examRepository.ExistsSameDayAsync(
                    exam.StudentId,
                    exam.SubjectId,
                    exam.ExamDate,
                    excludeExamId: 0);

                if (exists)
                    throw new InvalidOperationException(
                        "Bu şagird eyni gündə bu dərsdən artıq imtahan verib.");

                await _examRepository.AddAsync(exam);
                return exam;
            }

            // =========================
            // READ
            // =========================
            public async Task<Exam> GetByIdAsync(int id)
            {
                var exam = await _examRepository.GetByIdAsync(id);
                if (exam == null)
                    throw new KeyNotFoundException("İmtahan tapılmadı.");

                return exam;
            }

            public Task<IReadOnlyList<Exam>> GetAllAsync()
            {
                return _examRepository.GetAllWithDetailsAsync();
            }

            public Task<IReadOnlyList<Exam>> GetByStudentIdAsync(int studentId)
            {
                return _examRepository.GetByStudentIdAsync(studentId);
            }

            public Task<IReadOnlyList<Exam>> GetBySubjectIdAsync(int subjectId)
            {
                return _examRepository.GetBySubjectIdAsync(subjectId);
            }

            // =========================
            // UPDATE
            // =========================
            public async Task UpdateAsync(Exam exam)
            {
                var existing = await _examRepository.GetByIdAsync(exam.Id);
                if (existing == null)
                    throw new KeyNotFoundException("İmtahan tapılmadı.");

                if (exam.Score < 1 || exam.Score > 9)
                    throw new InvalidOperationException("Qiymət 1 ilə 9 arasında olmalıdır.");

                var exists = await _examRepository.ExistsSameDayAsync(
                    exam.StudentId,
                    exam.SubjectId,
                    exam.ExamDate,
                    exam.Id);

                if (exists)
                    throw new InvalidOperationException(
                        "Bu şagird eyni gündə bu dərsdən artıq imtahan verib.");

                existing.StudentId = exam.StudentId;
                existing.SubjectId = exam.SubjectId;
                existing.ExamDate = exam.ExamDate;
                existing.Score = exam.Score;

                await _examRepository.UpdateAsync(existing);
            }

            // =========================
            // DELETE
            // =========================
            public async Task DeleteAsync(int id)
            {
                var exam = await _examRepository.GetByIdAsync(id);
                if (exam == null)
                    throw new KeyNotFoundException("Silinəcək imtahan tapılmadı.");

                await _examRepository.DeleteAsync(exam);
            }
        }
    }

}

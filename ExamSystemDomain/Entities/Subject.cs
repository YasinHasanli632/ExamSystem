using ExamSystemDomain.Common;
using ExamSystemDomain.Enums;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ExamSystemDomain.Entities
{
    // Məktəbdə tədris olunan fənni (dərsi) təmsil edir
    public class Subject : BaseEntity
    {
        // Dərsin unikal kodu (məsələn: MAT, AZE və s.)
        public string SubjectCode { get; set; } = null!;

        // Dərsin adı
        public string SubjectName { get; set; } = null!;

        // Dərsin keçildiyi sinif
        public Grade Grade { get; set; }

        // Dərsi verən müəllimin adı
        public string TeacherFirstName { get; set; } = null!;

        // Dərsi verən müəllimin soyadı
        public string TeacherLastName { get; set; } = null!;

        // Bu dərsdən keçirilən imtahanların siyahısı
        // Əlaqə: 1 dərs -> çox imtahan
        public ICollection<Exam> Exams { get; set; } = new List<Exam>();
    }
}

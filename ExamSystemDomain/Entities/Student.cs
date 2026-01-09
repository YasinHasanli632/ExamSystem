using ExamSystemDomain.Common;
using ExamSystemDomain.Enums;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ExamSystemDomain.Entities
{
    // Məktəbdə oxuyan şagirdi təmsil edir
    public class Student : BaseEntity
    {
        // Şagirdin unikal nömrəsi (biznes açarı)
        public int StudentNumber { get; set; }

        // Şagirdin adı
        public string FirstName { get; set; } = null!;

        // Şagirdin soyadı
        public string LastName { get; set; } = null!;

        // Şagirdin oxuduğu sinif
        public Grade Grade { get; set; }

        // Şagirdin verdiyi imtahanların siyahısı
        // Əlaqə: 1 şagird -> çox imtahan
        public ICollection<Exam> Exams { get; set; } = new List<Exam>();
    }
}

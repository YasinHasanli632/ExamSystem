using ExamSystemDomain.Common;
using ExamSystemDomain.Enums;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ExamSystemDomain.Entities
{
   
    public class Subject : BaseEntity
    {
      
        public string SubjectCode { get; set; } = null!;

       
        public string SubjectName { get; set; } = null!;

       
        public Grade Grade { get; set; }

        
        public string TeacherFirstName { get; set; } = null!;

        
        public string TeacherLastName { get; set; } = null!;

      
        public ICollection<Exam> Exams { get; set; } = new List<Exam>();
    }
}

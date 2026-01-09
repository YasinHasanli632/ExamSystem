using ExamSystemDomain.Common;
using ExamSystemDomain.Enums;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ExamSystemDomain.Entities
{
  
    public class Student : BaseEntity
    {
    
        public int StudentNumber { get; set; }

       
        public string FirstName { get; set; } = null!;

       
        public string LastName { get; set; } = null!;

       
        public Grade Grade { get; set; }

      
        public ICollection<Exam> Exams { get; set; } = new List<Exam>();
    }
}

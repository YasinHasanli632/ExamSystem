using Microsoft.AspNetCore.Mvc;

namespace ExamSystemWeb.Controllers
{
    public class HomeController : Controller
    {
        public IActionResult Index()
        {
            return View();
        }
    }
}

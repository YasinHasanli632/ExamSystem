using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.AspNetCore.Mvc.ViewFeatures;
using Microsoft.EntityFrameworkCore;
namespace ExamSystemWeb.Filters
{
   

    public class GlobalExceptionFilter : IExceptionFilter
    {
        public void OnException(ExceptionContext context)
        {
            var tempDataFactory =
                context.HttpContext.RequestServices
                    .GetRequiredService<ITempDataDictionaryFactory>();

            var tempData =
                tempDataFactory.GetTempData(context.HttpContext);

            switch (context.Exception)
            {
                case InvalidOperationException:
                    tempData["ErrorMessage"] = context.Exception.Message;
                    break;

                case KeyNotFoundException:
                    tempData["ErrorMessage"] = context.Exception.Message;
                    break;

                case DbUpdateException dbEx:
                    if (dbEx.InnerException?.Message.Contains("FK_", StringComparison.OrdinalIgnoreCase) == true)
                    {
                        tempData["ErrorMessage"] =
                            "Bu məlumat digər qeydlərlə əlaqəlidir. Silmək mümkün deyil.";
                    }
                    else
                    {
                        tempData["ErrorMessage"] =
                            "Məlumat bazası əməliyyatı zamanı xəta baş verdi.";
                    }
                    break;

                default:
                    tempData["ErrorMessage"] =
                        "Gözlənilməz xəta baş verdi. Zəhmət olmasa yenidən cəhd edin.";
                    break;
            }

            context.Result = new RedirectToActionResult(
                "Index",
                context.RouteData.Values["controller"]!.ToString(),
                null);

            context.ExceptionHandled = true;
        }

    }

}

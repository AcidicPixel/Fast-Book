using System;
using System.Collections.Generic;
using System.Text;

namespace TravelSite.ServiceDefaults
{
    public class NotFoundException : Exception
    {
        public NotFoundException(string message) : base(message) { }
    }

    // Thrown when business rules or validation fails (maps to 400)
    public class BadRequestException : Exception
    {
        public BadRequestException(string message) : base(message) { }
    }
}

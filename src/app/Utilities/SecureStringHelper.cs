using System;
using System.Runtime.InteropServices;
using System.Security;

namespace CSE.DatabricksSCIMAutomation.Utilities
{
    static class SecureStringHelper
        {
        public static string ConvertToUnsecureString(SecureString secureString)
        {
            if (secureString == null)
                throw new ArgumentNullException(nameof(secureString));

            IntPtr unmanagedString = IntPtr.Zero;
            try
            {
                unmanagedString = Marshal.SecureStringToGlobalAllocUnicode(secureString);
                return Marshal.PtrToStringUni(unmanagedString);
            }
            finally
            {
                Marshal.ZeroFreeGlobalAllocUnicode(unmanagedString);
            }
        }

        public static SecureString ConvertToSecureString(string stringToSecure)
        {
            if (string.IsNullOrEmpty(stringToSecure))
                throw new ArgumentNullException(nameof(stringToSecure));

            var secureStr = new SecureString();
            if (stringToSecure.Length > 0)
            {
                foreach (var c in stringToSecure.ToCharArray()) secureStr.AppendChar(c);
            }
            return secureStr;
        }
    }
}

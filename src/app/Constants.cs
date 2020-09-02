namespace CSE.DatabricksSCIMAutomation
{
    /// <summary>
    /// String constants
    /// </summary>
    public sealed class Constants
    {
        public const string KeyVaultName = "KEYVAULT_NAME";
        public const string AuthType = "AUTH_TYPE";
        public const string LogLevel = "LOG_LEVEL";

        public const string CosmosCollection = "CosmosCollection";
        public const string CosmosDatabase = "CosmosDatabase";
        public const string CosmosKey = "CosmosKey";
        public const string CosmosUrl = "CosmosUrl";

        public const string AccessToken = "AccessToken";
        public const string LoginUsername = "LoginUsername";
        public const string LoginPassword = "LoginPassword";

        public const string AppInsightsKey = "AppInsightsKey";

        // if port is changed, also update value in the Dockerfiles
        public const string Port = "4120";

        public const int GracefulShutdownTimeout = 10;
    }
    public enum AuthenticationType { MI, CLI, VS }
}

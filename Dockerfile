### Build and Test the App
FROM mcr.microsoft.com/dotnet/core/sdk:3.1 AS build

### Optional: Set Proxy Variables
# ENV http_proxy {value}
# ENV https_proxy {value}
# ENV HTTP_PROXY {value}
# ENV HTTPS_PROXY {value}
# ENV no_proxy {value}
# ENV NO_PROXY {value}

### copy the source and tests
COPY src /src

WORKDIR /src/app

# build the app
RUN dotnet publish -c Release -o /app


###########################################################

### Build and Test the App
FROM build AS test

ENV DEBIAN_FRONTEND=noninteractive
# Install the Azure CLI
RUN mkdir -p /root/.azure \
    && apt-get update \
    && apt-get -y install --no-install-recommends apt-utils dialog lsb-release curl \
    #
    # Install the Azure CLI
    && echo "deb [arch=amd64] https://packages.microsoft.com/repos/azure-cli/ $(lsb_release -cs) main" > /etc/apt/sources.list.d/azure-cli.list \
    && curl -sL https://packages.microsoft.com/keys/microsoft.asc | apt-key add - 2>/dev/null \
    && apt-get update \
    && apt-get install -y azure-cli

ENV DEBIAN_FRONTEND=dialog

EXPOSE 4120

WORKDIR /src/tests

ENTRYPOINT [ "./runtests" ]


###########################################################

### Build the runtime container
FROM mcr.microsoft.com/dotnet/core/aspnet:3.1-alpine AS release

### Optional: Set Proxy Variables
# ENV http_proxy {value}
# ENV https_proxy {value}
# ENV HTTP_PROXY {value}
# ENV HTTPS_PROXY {value}
# ENV no_proxy {value}
# ENV NO_PROXY {value}

### if port is changed, also update value in Constants.cs
EXPOSE 4120
WORKDIR /app

### create a user
### dotnet needs a home directory
RUN addgroup -S databricksscimautomation && \
    adduser -S databricksscimautomation -G databricksscimautomation && \
    mkdir -p /home/databricksscimautomation && \
    chown -R databricksscimautomation:databricksscimautomation /home/databricksscimautomation

### run as databricksscim user
USER databricksscimautomation

### copy the app
COPY --from=build /app .

ENTRYPOINT [ "dotnet",  "databricksscimautomation.dll" ]

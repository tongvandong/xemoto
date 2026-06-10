# Build context = v2/backend
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY . .
RUN dotnet restore src/MoToSale.ApiGateway/MoToSale.ApiGateway.csproj
RUN dotnet publish src/MoToSale.ApiGateway/MoToSale.ApiGateway.csproj -c Release -o /app --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
COPY --from=build /app .
EXPOSE 5100
ENTRYPOINT ["dotnet", "MoToSale.ApiGateway.dll", "--urls", "http://+:5100"]

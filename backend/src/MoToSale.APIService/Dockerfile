# Build context = v2/backend
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY . .
RUN dotnet restore src/MoToSale.APIService/MoToSale.APIService.csproj
RUN dotnet publish src/MoToSale.APIService/MoToSale.APIService.csproj -c Release -o /app --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
COPY --from=build /app .
EXPOSE 5102
ENTRYPOINT ["dotnet", "MoToSale.APIService.dll", "--urls", "http://+:5102"]

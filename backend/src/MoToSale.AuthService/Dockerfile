# Build context = v2/backend
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY . .
RUN dotnet restore src/MoToSale.AuthService/MoToSale.AuthService.csproj
RUN dotnet publish src/MoToSale.AuthService/MoToSale.AuthService.csproj -c Release -o /app --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
COPY --from=build /app .
EXPOSE 5101
ENTRYPOINT ["dotnet", "MoToSale.AuthService.dll", "--urls", "http://+:5101"]

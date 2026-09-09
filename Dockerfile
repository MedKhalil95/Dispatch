# Use the official .NET 8 SDK image for building
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy the solution and project files
COPY DailyDispatch.sln .
COPY AuthService/AuthService.csproj AuthService/
COPY DispatchApp/DispatchApp.csproj DispatchApp/

# Restore dependencies
RUN dotnet restore

# Copy all source code
COPY . .

# Publish both services
WORKDIR /src/DispatchApp
RUN dotnet publish -c Release -o /app/DispatchApp --no-restore

WORKDIR /src/AuthService
RUN dotnet publish -c Release -o /app/AuthService --no-restore

# Build the runtime image
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app

# Copy the published outputs
COPY --from=build /app/DispatchApp ./DispatchApp/
COPY --from=build /app/AuthService ./AuthService/

# Create a startup script
RUN echo '#!/bin/bash\n\
cd /app/AuthService && dotnet AuthService.dll --urls=http://0.0.0.0:5087 &\n\
cd /app/DispatchApp && dotnet DispatchApp.dll --urls=http://0.0.0.0:5080 --AUTH_SERVICE_URL=http://localhost:5087\n\
' > /app/start.sh && chmod +x /app/start.sh

# Expose ports
EXPOSE 5080 5087

# Set environment variable for AuthService URL
ENV AUTH_SERVICE_URL=http://localhost:5087

# Start both services
CMD ["/app/start.sh"]
# Azure CLI Deployment Guide for Spring Boot Applications

## Overview
This guide provides a simpler approach to deploying Spring Boot 4 applications to Azure using Azure CLI commands. Deploy Container Apps with optional PostgreSQL database support.

**Core Components:**
- **Azure Container Apps**: Serverless container platform
- **Azure Container Registry**: Private Docker registry
- **Azure CLI**: Simple command-line deployment

**Optional (add only if needed):**
- **Azure Database for PostgreSQL Flexible Server**: Managed database

**Key Benefits:**

1. No Terraform or complex IaC required
2. Simple bash scripts you can run directly
3. Fast deployment with minimal configuration
4. Easy to understand and modify
5. Add database only when needed

## Prerequisites

```bash
# Install Azure CLI (if not already installed)
# macOS
brew install azure-cli

# Windows
# Download from: https://aka.ms/installazurecliwindows

# Linux
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash

# Login to Azure
az login

# Set your subscription
az account set --subscription "YOUR_SUBSCRIPTION_ID"

# Install Container Apps extension
az extension add --name containerapp --upgrade
```

## Quick Start (Without Database)

This is the simplest deployment for applications that don't need a database.

### 1. Set Variables

```bash
# Configuration
export RESOURCE_GROUP="myapp-rg"
export LOCATION="eastus"
export APP_NAME="myapp"
export ACR_NAME="${APP_NAME}acr$RANDOM"
export CONTAINER_APP_ENV="${APP_NAME}-env"
export CONTAINER_APP_NAME="${APP_NAME}-app"
```

### 2. Create Resources

```bash
# Create resource group
az group create \
  --name $RESOURCE_GROUP \
  --location $LOCATION

# Create Container Registry
az acr create \
  --resource-group $RESOURCE_GROUP \
  --name $ACR_NAME \
  --sku Basic \
  --admin-enabled true

# Create Container Apps Environment
az containerapp env create \
  --name $CONTAINER_APP_ENV \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION
```

### 3. Build and Push Docker Image

```bash
# Get ACR login server
ACR_LOGIN_SERVER=$(az acr show \
  --name $ACR_NAME \
  --query loginServer \
  --output tsv)

# Login to ACR
az acr login --name $ACR_NAME

# Build and push image (from your Spring Boot project directory)
docker build -t $ACR_LOGIN_SERVER/$APP_NAME:latest .
docker push $ACR_LOGIN_SERVER/$APP_NAME:latest
```

### 4. Deploy Container App

```bash
# Get ACR credentials
ACR_USERNAME=$(az acr credential show \
  --name $ACR_NAME \
  --query username \
  --output tsv)

ACR_PASSWORD=$(az acr credential show \
  --name $ACR_NAME \
  --query passwords[0].value \
  --output tsv)

# Create Container App
az containerapp create \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --environment $CONTAINER_APP_ENV \
  --image $ACR_LOGIN_SERVER/$APP_NAME:latest \
  --registry-server $ACR_LOGIN_SERVER \
  --registry-username $ACR_USERNAME \
  --registry-password $ACR_PASSWORD \
  --target-port 8080 \
  --ingress external \
  --cpu 0.5 \
  --memory 1Gi \
  --min-replicas 0 \
  --max-replicas 10 \
  --env-vars \
    "SERVER_PORT=8080" \
    "JAVA_OPTS=-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0"

# Optional: Autoscaling rule (HTTP RPS)
az containerapp up \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --source . \
  --target-port 8080 \
  --ingress external \
  --max-replicas 10 \
  --min-replicas 0 \
  --scale-rules "http={concurrency=50}" \
  --env-vars "JAVA_OPTS=-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0"

# Managed Identity + Key Vault secrets (example)
az identity create -g $RESOURCE_GROUP -n ${APP_NAME}-mi
IDENTITY_ID=$(az identity show -g $RESOURCE_GROUP -n ${APP_NAME}-mi --query id -o tsv)
az containerapp identity assign \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --identities $IDENTITY_ID

# In Key Vault (once): grant access to managed identity
# az keyvault set-policy --name $KEY_VAULT --object-id $IDENTITY_ID --secret-permissions get list
# In Container App: set env var to a Key Vault secret reference
# --set-secrets DB_PASSWORD=keyvaultref://${KEY_VAULT}/secrets/DB_PASSWORD

# Get the application URL
az containerapp show \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --query properties.configuration.ingress.fqdn \
  --output tsv
```

### 5. Test Your Application

```bash
# Get the URL
APP_URL="https://$(az containerapp show \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --query properties.configuration.ingress.fqdn \
  --output tsv)"

# Test health endpoint
curl $APP_URL/actuator/health

# Expected: {"status":"UP"}
```

## Deployment Script (Without Database)

Save this as `deploy-azure-simple.sh`:

```bash
#!/bin/bash
set -e

# Configuration
RESOURCE_GROUP="myapp-rg"
LOCATION="eastus"
APP_NAME="myapp"
ACR_NAME="${APP_NAME}acr$RANDOM"
CONTAINER_APP_ENV="${APP_NAME}-env"
CONTAINER_APP_NAME="${APP_NAME}-app"

echo "🚀 Deploying $APP_NAME to Azure..."

# Create resource group
echo "📦 Creating resource group..."
az group create \
  --name $RESOURCE_GROUP \
  --location $LOCATION \
  --output none

# Create Container Registry
echo "🏗️  Creating Container Registry..."
az acr create \
  --resource-group $RESOURCE_GROUP \
  --name $ACR_NAME \
  --sku Basic \
  --admin-enabled true \
  --output none

# Get ACR details
ACR_LOGIN_SERVER=$(az acr show --name $ACR_NAME --query loginServer -o tsv)
echo "📝 ACR: $ACR_LOGIN_SERVER"

# Build and push image
echo "🐳 Building Docker image..."
az acr build \
  --registry $ACR_NAME \
  --image $APP_NAME:latest \
  --file Dockerfile \
  .

# Create Container Apps Environment
echo "🌍 Creating Container Apps Environment..."
az containerapp env create \
  --name $CONTAINER_APP_ENV \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --output none

# Get ACR credentials
ACR_USERNAME=$(az acr credential show --name $ACR_NAME --query username -o tsv)
ACR_PASSWORD=$(az acr credential show --name $ACR_NAME --query passwords[0].value -o tsv)

# Deploy Container App
echo "🚢 Deploying Container App..."
az containerapp create \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --environment $CONTAINER_APP_ENV \
  --image $ACR_LOGIN_SERVER/$APP_NAME:latest \
  --registry-server $ACR_LOGIN_SERVER \
  --registry-username $ACR_USERNAME \
  --registry-password $ACR_PASSWORD \
  --target-port 8080 \
  --ingress external \
  --cpu 0.5 \
  --memory 1Gi \
  --min-replicas 0 \
  --max-replicas 10 \
  --env-vars \
    "SERVER_PORT=8080" \
    "JAVA_OPTS=-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0" \
  --output none

# Get application URL
APP_URL="https://$(az containerapp show \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --query properties.configuration.ingress.fqdn -o tsv)"

echo "✅ Deployment complete!"
echo "🌐 Application URL: $APP_URL"
echo "🏥 Health check: $APP_URL/actuator/health"
```

**Usage:**
```bash
chmod +x deploy-azure-simple.sh
./deploy-azure-simple.sh
```

## With PostgreSQL Database

Add these steps **only if your application needs a database**.

### Additional Variables

```bash
# Database configuration (add to your variables)
export DB_SERVER_NAME="${APP_NAME}-db-$RANDOM"
export DB_NAME="appdb"
export DB_ADMIN_USER="pgadmin"
export DB_ADMIN_PASSWORD="YourSecurePassword123!"  # Change this!
export VNET_NAME="${APP_NAME}-vnet"
export SUBNET_APP="subnet-app"
export SUBNET_DB="subnet-db"
```

### Create Virtual Network

```bash
# Create VNET
az network vnet create \
  --resource-group $RESOURCE_GROUP \
  --name $VNET_NAME \
  --location $LOCATION \
  --address-prefix 10.0.0.0/16

# Create subnet for Container Apps
az network vnet subnet create \
  --resource-group $RESOURCE_GROUP \
  --vnet-name $VNET_NAME \
  --name $SUBNET_APP \
  --address-prefixes 10.0.0.0/23

# Create subnet for PostgreSQL
az network vnet subnet create \
  --resource-group $RESOURCE_GROUP \
  --vnet-name $VNET_NAME \
  --name $SUBNET_DB \
  --address-prefixes 10.0.2.0/24 \
  --delegations Microsoft.DBforPostgreSQL/flexibleServers

# Get subnet IDs
SUBNET_APP_ID=$(az network vnet subnet show \
  --resource-group $RESOURCE_GROUP \
  --vnet-name $VNET_NAME \
  --name $SUBNET_APP \
  --query id -o tsv)
```

### Create PostgreSQL Database

```bash
# Create PostgreSQL Flexible Server
az postgres flexible-server create \
  --resource-group $RESOURCE_GROUP \
  --name $DB_SERVER_NAME \
  --location $LOCATION \
  --admin-user $DB_ADMIN_USER \
  --admin-password $DB_ADMIN_PASSWORD \
  --sku-name Standard_B1ms \
  --tier Burstable \
  --storage-size 32 \
  --version 16 \
  --vnet $VNET_NAME \
  --subnet $SUBNET_DB \
  --yes

# Firewall (allow Azure services; tighten as needed)
az postgres flexible-server firewall-rule create \
  --resource-group $RESOURCE_GROUP \
  --name $DB_SERVER_NAME \
  --rule-name allowAzureIps \
  --start-ip-address 0.0.0.0 --end-ip-address 0.0.0.0

# Backup & HA best practice
az postgres flexible-server update \
  --resource-group $RESOURCE_GROUP \
  --name $DB_SERVER_NAME \
  --backup-retention 7 \
  --geo-redundant-backup Enabled

# Create database
az postgres flexible-server db create \
  --resource-group $RESOURCE_GROUP \
  --server-name $DB_SERVER_NAME \
  --database-name $DB_NAME

# Configure server parameters
az postgres flexible-server parameter set \
  --resource-group $RESOURCE_GROUP \
  --server-name $DB_SERVER_NAME \
  --name max_connections \
  --value 100

# Get database host
DB_HOST=$(az postgres flexible-server show \
  --resource-group $RESOURCE_GROUP \
  --name $DB_SERVER_NAME \
  --query fullyQualifiedDomainName -o tsv)

# JDBC connection string (SSL)
# jdbc:postgresql://$DB_HOST:5432/$DB_NAME?sslmode=require

```

### Update Container App Environment with VNET

```bash
# Create Container Apps Environment with VNET
az containerapp env create \
  --name $CONTAINER_APP_ENV \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --infrastructure-subnet-resource-id $SUBNET_APP_ID
```

### Deploy Container App with Database Connection

```bash
# Database connection string
DB_URL="jdbc:postgresql://${DB_HOST}:5432/${DB_NAME}?sslmode=require"

# Create Container App with database configuration
az containerapp create \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --environment $CONTAINER_APP_ENV \
  --image $ACR_LOGIN_SERVER/$APP_NAME:latest \
  --registry-server $ACR_LOGIN_SERVER \
  --registry-username $ACR_USERNAME \
  --registry-password $ACR_PASSWORD \
  --target-port 8080 \
  --ingress external \
  --cpu 0.5 \
  --memory 1Gi \
  --min-replicas 1 \
  --max-replicas 10 \
  --secrets \
    "db-password=$DB_ADMIN_PASSWORD" \
  --env-vars \
    "SPRING_DATASOURCE_URL=$DB_URL" \
    "SPRING_DATASOURCE_USERNAME=$DB_ADMIN_USER" \
    "SPRING_DATASOURCE_PASSWORD=secretref:db-password" \
    "SPRING_JPA_HIBERNATE_DDL_AUTO=update" \
    "SERVER_PORT=8080" \
    "JAVA_OPTS=-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0"
```

## Complete Deployment Script (With Database)

Save this as `deploy-azure-with-db.sh`:

```bash
#!/bin/bash
set -e

# Configuration
RESOURCE_GROUP="myapp-rg"
LOCATION="eastus"
APP_NAME="myapp"
ACR_NAME="${APP_NAME}acr$RANDOM"
CONTAINER_APP_ENV="${APP_NAME}-env"
CONTAINER_APP_NAME="${APP_NAME}-app"
DB_SERVER_NAME="${APP_NAME}db$RANDOM"
DB_NAME="appdb"
DB_ADMIN_USER="pgadmin"
DB_ADMIN_PASSWORD="YourSecurePassword123!"  # Change this!
VNET_NAME="${APP_NAME}-vnet"
SUBNET_APP="subnet-app"
SUBNET_DB="subnet-db"

echo "🚀 Deploying $APP_NAME with PostgreSQL to Azure..."

# Create resource group
echo "📦 Creating resource group..."
az group create \
  --name $RESOURCE_GROUP \
  --location $LOCATION \
  --output none

# Create VNET
echo "🌐 Creating virtual network..."
az network vnet create \
  --resource-group $RESOURCE_GROUP \
  --name $VNET_NAME \
  --location $LOCATION \
  --address-prefix 10.0.0.0/16 \
  --output none

# Create subnets
az network vnet subnet create \
  --resource-group $RESOURCE_GROUP \
  --vnet-name $VNET_NAME \
  --name $SUBNET_APP \
  --address-prefixes 10.0.0.0/23 \
  --output none

az network vnet subnet create \
  --resource-group $RESOURCE_GROUP \
  --vnet-name $VNET_NAME \
  --name $SUBNET_DB \
  --address-prefixes 10.0.2.0/24 \
  --delegations Microsoft.DBforPostgreSQL/flexibleServers \
  --output none

# Create Container Registry
echo "🏗️  Creating Container Registry..."
az acr create \
  --resource-group $RESOURCE_GROUP \
  --name $ACR_NAME \
  --sku Basic \
  --admin-enabled true \
  --output none

# Build and push image
echo "🐳 Building Docker image..."
az acr build \
  --registry $ACR_NAME \
  --image $APP_NAME:latest \
  --file Dockerfile \
  .

ACR_LOGIN_SERVER=$(az acr show --name $ACR_NAME --query loginServer -o tsv)

# Create PostgreSQL database
echo "🗄️  Creating PostgreSQL database (this may take 5-10 minutes)..."
az postgres flexible-server create \
  --resource-group $RESOURCE_GROUP \
  --name $DB_SERVER_NAME \
  --location $LOCATION \
  --admin-user $DB_ADMIN_USER \
  --admin-password $DB_ADMIN_PASSWORD \
  --sku-name Standard_B1ms \
  --tier Burstable \
  --storage-size 32 \
  --version 16 \
  --vnet $VNET_NAME \
  --subnet $SUBNET_DB \
  --yes \
  --output none

az postgres flexible-server db create \
  --resource-group $RESOURCE_GROUP \
  --server-name $DB_SERVER_NAME \
  --database-name $DB_NAME \
  --output none

DB_HOST=$(az postgres flexible-server show \
  --resource-group $RESOURCE_GROUP \
  --name $DB_SERVER_NAME \
  --query fullyQualifiedDomainName -o tsv)

# Get subnet ID
SUBNET_APP_ID=$(az network vnet subnet show \
  --resource-group $RESOURCE_GROUP \
  --vnet-name $VNET_NAME \
  --name $SUBNET_APP \
  --query id -o tsv)

# Create Container Apps Environment
echo "🌍 Creating Container Apps Environment..."
az containerapp env create \
  --name $CONTAINER_APP_ENV \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --infrastructure-subnet-resource-id $SUBNET_APP_ID \
  --output none

# Get ACR credentials
ACR_USERNAME=$(az acr credential show --name $ACR_NAME --query username -o tsv)
ACR_PASSWORD=$(az acr credential show --name $ACR_NAME --query passwords[0].value -o tsv)

# Deploy Container App
echo "🚢 Deploying Container App with database connection..."
DB_URL="jdbc:postgresql://${DB_HOST}:5432/${DB_NAME}?sslmode=require"

az containerapp create \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --environment $CONTAINER_APP_ENV \
  --image $ACR_LOGIN_SERVER/$APP_NAME:latest \
  --registry-server $ACR_LOGIN_SERVER \
  --registry-username $ACR_USERNAME \
  --registry-password $ACR_PASSWORD \
  --target-port 8080 \
  --ingress external \
  --cpu 0.5 \
  --memory 1Gi \
  --min-replicas 1 \
  --max-replicas 10 \
  --secrets \
    "db-password=$DB_ADMIN_PASSWORD" \
  --env-vars \
    "SPRING_DATASOURCE_URL=$DB_URL" \
    "SPRING_DATASOURCE_USERNAME=$DB_ADMIN_USER" \
    "SPRING_DATASOURCE_PASSWORD=secretref:db-password" \
    "SPRING_JPA_HIBERNATE_DDL_AUTO=update" \
    "SERVER_PORT=8080" \
    "JAVA_OPTS=-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0" \
  --output none

# Get application URL
APP_URL="https://$(az containerapp show \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --query properties.configuration.ingress.fqdn -o tsv)"

echo "✅ Deployment complete!"
echo "🌐 Application URL: $APP_URL"
echo "🏥 Health check: $APP_URL/actuator/health"
echo "🗄️  Database: $DB_HOST"
```

**Usage:**
```bash
chmod +x deploy-azure-with-db.sh
./deploy-azure-with-db.sh
```

## Update Existing Deployment

### Update Container App Image

```bash
# Update to new image version
az containerapp update \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --image $ACR_LOGIN_SERVER/$APP_NAME:v2
```

### Update Environment Variables

```bash
az containerapp update \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --set-env-vars "NEW_VAR=value"
```

### Scale Replicas

```bash
az containerapp update \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --min-replicas 2 \
  --max-replicas 20
```

### Update Resources

```bash
az containerapp update \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --cpu 1.0 \
  --memory 2Gi
```

## Monitoring and Logs

### View Logs

```bash
# Stream logs
az containerapp logs show \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --follow

# View recent logs
az containerapp logs show \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --tail 100
```

### Check Application Status

```bash
# Get app status
az containerapp show \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --query "properties.runningStatus" \
  --output tsv

# List revisions
az containerapp revision list \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --output table
```

### View Metrics

```bash
# Get replica count
az containerapp show \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --query "properties.template.scale" \
  --output json
```

## Database Management

### Connect to Database

```bash
# Get connection info
DB_HOST=$(az postgres flexible-server show \
  --resource-group $RESOURCE_GROUP \
  --name $DB_SERVER_NAME \
  --query fullyQualifiedDomainName -o tsv)

# Using psql from Container App
az containerapp exec \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --command "sh"
```

### Database Backups

```bash
# List backups
az postgres flexible-server backup list \
  --resource-group $RESOURCE_GROUP \
  --name $DB_SERVER_NAME \
  --output table

# Restore database
az postgres flexible-server restore \
  --resource-group $RESOURCE_GROUP \
  --name $DB_SERVER_NAME-restored \
  --source-server $DB_SERVER_NAME \
  --restore-time "2026-02-13T10:00:00Z"
```

## Cleanup

### Delete Everything

```bash
# Delete entire resource group (WARNING: This deletes everything!)
az group delete \
  --name $RESOURCE_GROUP \
  --yes \
  --no-wait
```

### Delete Specific Resources

```bash
# Delete Container App only
az containerapp delete \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --yes

# Delete database only
az postgres flexible-server delete \
  --resource-group $RESOURCE_GROUP \
  --name $DB_SERVER_NAME \
  --yes
```

## Cost Optimization

### Scale to Zero (Development)

```bash
az containerapp update \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --min-replicas 0 \
  --max-replicas 5
```

### Stop Database (Development)

```bash
# Stop database to save costs
az postgres flexible-server stop \
  --resource-group $RESOURCE_GROUP \
  --name $DB_SERVER_NAME

# Start when needed
az postgres flexible-server start \
  --resource-group $RESOURCE_GROUP \
  --name $DB_SERVER_NAME
```

### Check Costs

```bash
# View costs for resource group
az consumption usage list \
  --start-date 2026-02-01 \
  --end-date 2026-02-13 \
  --query "[?contains(instanceName, '$RESOURCE_GROUP')]" \
  --output table
```

## Troubleshooting

### Application Won't Start

```bash
# Check logs
az containerapp logs show \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --tail 200

# Check revision status
az containerapp revision list \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --output table

# Restart app
az containerapp revision restart \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP
```

### Database Connection Issues

```bash
# Test database connectivity from Container App
az containerapp exec \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --command "sh -c 'ping -c 3 $DB_HOST'"

# Check database status
az postgres flexible-server show \
  --resource-group $RESOURCE_GROUP \
  --name $DB_SERVER_NAME \
  --query state \
  --output tsv
```

### View Configuration

```bash
# Show all environment variables
az containerapp show \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --query "properties.template.containers[0].env" \
  --output json
```

## Best Practices

### Security
- Store secrets in Azure Key Vault (not in scripts)
- Use managed identities instead of passwords when possible
- Keep databases in private subnets
- Enable HTTPS only (automatic with Container Apps)

### Cost Management
- Use `--min-replicas 0` for dev/test environments
- Stop databases during off-hours for development
- Use Burstable SKU (B1ms) for PostgreSQL in dev
- Monitor costs regularly

### Performance
- Use connection pooling (HikariCP) for database
- Configure appropriate CPU/memory limits
- Set up proper health checks
- Enable application insights for monitoring

### Development Workflow
```bash
# Quick update workflow
az acr build --registry $ACR_NAME --image $APP_NAME:latest .
az containerapp update \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --image $ACR_LOGIN_SERVER/$APP_NAME:latest
```

## Comparison with Terraform

**Use Azure CLI when:**
- ✅ Quick prototypes and demos
- ✅ Simple single-environment deployments
- ✅ Learning Azure Container Apps
- ✅ One-off deployments
- ✅ Minimal infrastructure management

**Use Terraform when:**
- ✅ Multiple environments (dev/staging/prod)
- ✅ Complex infrastructure with many dependencies
- ✅ Team collaboration with version control
- ✅ Infrastructure reusability across projects
- ✅ Automated CI/CD pipelines

## Cleanup (to avoid unexpected costs)
```bash
az containerapp delete --name $CONTAINER_APP_NAME --resource-group $RESOURCE_GROUP --yes || true
az containerapp env delete --name $CONTAINER_APP_ENV --resource-group $RESOURCE_GROUP --yes || true
az acr delete --name $ACR_NAME --resource-group $RESOURCE_GROUP --yes || true
az postgres flexible-server delete --name $DB_SERVER_NAME --resource-group $RESOURCE_GROUP --yes || true
az group delete --name $RESOURCE_GROUP --yes --no-wait || true
```

## Additional Resources

- [Azure Container Apps Documentation](https://learn.microsoft.com/azure/container-apps/)
- [Azure CLI Reference](https://learn.microsoft.com/cli/azure/)
- [PostgreSQL Flexible Server CLI](https://learn.microsoft.com/cli/azure/postgres/flexible-server)
- [Spring Boot on Azure](https://learn.microsoft.com/azure/developer/java/spring-framework/)
- [Terraform Guide](AZURE.md) - For IaC approach
- [Database Best Practices](DATABASE.md)
- [Docker Guide](DOCKER.md)

## Next Steps

1. ✅ Install Azure CLI and login
2. ✅ Prepare your Spring Boot application with Dockerfile
3. ✅ Choose deployment type (with or without database)
4. ✅ Run deployment script
5. ✅ Test your application
6. ✅ Set up monitoring and alerts
7. ✅ Configure custom domain (optional)
8. ✅ Set up CI/CD pipeline (optional)

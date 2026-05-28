@description('Location for all resources')
param location string = resourceGroup().location

@description('App name prefix used for all resource names')
param appName string = 'mtginvestor'

@description('Environment name (dev, staging, prod)')
param environment string = 'dev'

@description('MongoDB Atlas connection string')
@secure()
param mongodbUri string

@description('JWT secret')
@secure()
param jwtSecret string

@description('JWT refresh secret')
@secure()
param jwtRefreshSecret string

var resourcePrefix = '${appName}-${environment}'

// ── Storage account for Azure Functions + queues ──────────────────────────────
resource storageAccount 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  name: '${appName}${environment}sa'
  location: location
  sku: { name: 'Standard_LRS' }
  kind: 'StorageV2'
  properties: { minimumTlsVersion: 'TLS1_2' }
}

// Queues
resource queueService 'Microsoft.Storage/storageAccounts/queueServices@2023-01-01' = {
  parent: storageAccount
  name: 'default'
}

resource enrichQueue 'Microsoft.Storage/storageAccounts/queueServices/queues@2023-01-01' = {
  parent: queueService
  name: 'mtg-enrich'
}

resource scoreQueue 'Microsoft.Storage/storageAccounts/queueServices/queues@2023-01-01' = {
  parent: queueService
  name: 'mtg-score'
}

// ── Redis Cache ───────────────────────────────────────────────────────────────
resource redis 'Microsoft.Cache/redis@2023-08-01' = {
  name: '${resourcePrefix}-redis'
  location: location
  properties: {
    sku: { name: 'Basic', family: 'C', capacity: 0 }
    enableNonSslPort: false
    minimumTlsVersion: '1.2'
  }
}

// ── Log Analytics Workspace ───────────────────────────────────────────────────
resource logWorkspace 'Microsoft.OperationalInsights/workspaces@2022-10-01' = {
  name: '${resourcePrefix}-logs'
  location: location
  properties: { sku: { name: 'PerGB2018' } }
}

// ── Application Insights ──────────────────────────────────────────────────────
resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: '${resourcePrefix}-ai'
  location: location
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: logWorkspace.id
  }
}

// ── Container Apps Environment ────────────────────────────────────────────────
resource containerEnv 'Microsoft.App/managedEnvironments@2023-05-01' = {
  name: '${resourcePrefix}-env'
  location: location
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logWorkspace.properties.customerId
        sharedKey: logWorkspace.listKeys().primarySharedKey
      }
    }
  }
}

// ── Container Registry ────────────────────────────────────────────────────────
resource registry 'Microsoft.ContainerRegistry/registries@2023-01-01-preview' = {
  name: '${appName}${environment}cr'
  location: location
  sku: { name: 'Basic' }
  properties: { adminUserEnabled: true }
}

// ── Container App (Express API) ───────────────────────────────────────────────
resource containerApp 'Microsoft.App/containerApps@2023-05-01' = {
  name: '${resourcePrefix}-api'
  location: location
  properties: {
    managedEnvironmentId: containerEnv.id
    configuration: {
      ingress: {
        external: true
        targetPort: 3000
        transport: 'http'
      }
      registries: [{
        server: registry.properties.loginServer
        username: registry.listCredentials().username
        passwordSecretRef: 'registry-password'
      }]
      secrets: [
        { name: 'registry-password', value: registry.listCredentials().passwords[0].value }
        { name: 'mongodb-uri', value: mongodbUri }
        { name: 'jwt-secret', value: jwtSecret }
        { name: 'jwt-refresh-secret', value: jwtRefreshSecret }
        { name: 'storage-conn-str', value: 'DefaultEndpointsProtocol=https;AccountName=${storageAccount.name};AccountKey=${storageAccount.listKeys().keys[0].value};EndpointSuffix=core.windows.net' }
      ]
    }
    template: {
      containers: [{
        name: 'api'
        image: '${registry.properties.loginServer}/mtg-investor-api:latest'
        env: [
          { name: 'NODE_ENV', value: 'production' }
          { name: 'PORT', value: '3000' }
          { name: 'MONGODB_URI', secretRef: 'mongodb-uri' }
          { name: 'JWT_SECRET', secretRef: 'jwt-secret' }
          { name: 'JWT_REFRESH_SECRET', secretRef: 'jwt-refresh-secret' }
          { name: 'AZURE_STORAGE_CONNECTION_STRING', secretRef: 'storage-conn-str' }
          { name: 'REDIS_URL', value: 'rediss://:${redis.listKeys().primaryKey}@${redis.properties.hostName}:6380' }
          { name: 'QUEUE_NAME_ENRICH', value: 'mtg-enrich' }
          { name: 'QUEUE_NAME_SCORE', value: 'mtg-score' }
          { name: 'SCHEDULE_INGEST', value: 'false' }
        ]
        resources: { cpu: json('0.5'), memory: '1Gi' }
      }]
      scale: { minReplicas: 1, maxReplicas: 5 }
    }
  }
}

// ── Azure Functions (background jobs) ────────────────────────────────────────
resource functionPlan 'Microsoft.Web/serverfarms@2023-01-01' = {
  name: '${resourcePrefix}-fn-plan'
  location: location
  sku: { name: 'Y1', tier: 'Dynamic' }
  kind: 'functionapp'
}

resource functionApp 'Microsoft.Web/sites@2023-01-01' = {
  name: '${resourcePrefix}-fn'
  location: location
  kind: 'functionapp'
  properties: {
    serverFarmId: functionPlan.id
    siteConfig: {
      appSettings: [
        { name: 'AzureWebJobsStorage', value: 'DefaultEndpointsProtocol=https;AccountName=${storageAccount.name};AccountKey=${storageAccount.listKeys().keys[0].value};EndpointSuffix=core.windows.net' }
        { name: 'FUNCTIONS_EXTENSION_VERSION', value: '~4' }
        { name: 'FUNCTIONS_WORKER_RUNTIME', value: 'node' }
        { name: 'WEBSITE_NODE_DEFAULT_VERSION', value: '~20' }
        { name: 'MONGODB_URI', value: mongodbUri }
        { name: 'AZURE_STORAGE_CONNECTION_STRING', value: 'DefaultEndpointsProtocol=https;AccountName=${storageAccount.name};AccountKey=${storageAccount.listKeys().keys[0].value};EndpointSuffix=core.windows.net' }
        { name: 'QUEUE_NAME_ENRICH', value: 'mtg-enrich' }
        { name: 'QUEUE_NAME_SCORE', value: 'mtg-score' }
        { name: 'APPINSIGHTS_INSTRUMENTATIONKEY', value: appInsights.properties.InstrumentationKey }
      ]
      nodeVersion: '~20'
    }
  }
}

// ── Outputs ───────────────────────────────────────────────────────────────────
output apiUrl string = 'https://${containerApp.properties.configuration.ingress.fqdn}'
output functionAppName string = functionApp.name
output registryLoginServer string = registry.properties.loginServer

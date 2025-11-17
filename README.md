# Portfolio API - AWS CDK Projekt

Projekt AWS CDK z funkcjami Lambda i API Gateway. Zorganizowany w strukturze z factory pattern i centralną konfiguracją.

- **Factory Pattern** - modułowe komponenty CDK (api-gateway-factory, lambda-factory, api-router-factory)
- **Centralna konfiguracja** - wszystkie Lambda functions w jednym miejscu (`lambda.config.ts`)
- **TypeScript** - pełne wsparcie typów
- **Error handling** - centralna obsługa błędów z custom error classes
- **Multipart parser** - obsługa przesyłania plików przez multipart/form-data
- **API Gateway** - REST API z API Key authentication
- **CORS** - skonfigurowany dla wszystkich originów

## Struktura projektu

```
portfolio-api/
├── bin/
│   └── app.ts                      # Punkt wejścia aplikacji CDK
├── src/
│   ├── core/                       # Core funkcjonalność
│   │   ├── config/                 # Konfiguracja
│   │   │   ├── api-messages.config.ts
│   │   │   ├── lambda.config.ts    # Konfiguracja Lambda functions
│   │   │   └── index.ts
│   │   ├── factories/               # Factory functions
│   │   │   ├── api-gateway-factory.ts
│   │   │   ├── api-router-factory.ts
│   │   │   ├── lambda-factory.ts
│   │   │   └── index.ts
│   │   └── models/                  # Modele TypeScript
│   │       ├── api-endpoint.model.ts
│   │       ├── errors.model.ts
│   │       ├── lambda.model.ts
│   │       └── index.ts
│   ├── lambdas/                     # Funkcje Lambda
│   │   └── ibkr-csv-parser/
│   │       └── index.ts              # IBKR CSV parser handler
│   ├── utils/                       # Funkcje pomocnicze
│   │   ├── lambda-helpers.ts        # Helpers dla Lambda responses
│   │   └── index.ts
│   └── stack.ts                     # Główny stack CDK
├── .env.example                     # Przykładowa konfiguracja środowiska
├── .gitignore
├── cdk.json                         # Konfiguracja CDK
├── package.json
├── tsconfig.json
└── README.md
```

## Wymagania

- **Node.js** (wersja 18 lub nowsza)
- **AWS CLI** zainstalowany i skonfigurowany
- **AWS CDK CLI** zainstalowany globalnie: `npm install -g aws-cdk`
- **Konto AWS** z odpowiednimi uprawnieniami

## Instalacja

1. Zainstaluj zależności:
```bash
npm install
```

2. Skonfiguruj AWS credentials (jeśli jeszcze nie masz):
```bash
aws configure --profile portfolio-api
```

Wprowadź:
- AWS Access Key ID
- AWS Secret Access Key
- Default region: `eu-west-1` (lub inny)
- Default output format: `json`

3. Sprawdź konfigurację:
```bash
npm run check:aws:profile
```

## Konfiguracja środowiska (opcjonalnie)

1. Skopiuj przykładowy plik `.env`:
```bash
cp .env.example .env
```

2. Edytuj `.env` jeśli potrzebujesz zmienić domyślne wartości:
```env
CDK_DEFAULT_REGION=eu-west-1
# AWS_PROFILE=portfolio-api
```

## Deploy

### Pierwszy deploy (bootstrap)

Przed pierwszym deployem wykonaj bootstrap CDK (tylko raz na konto/region):
```bash
cdk bootstrap --profile portfolio-api
```

### Deploy do środowiska

**Deploy do dev (domyślne):**
```bash
npm run deploy:dev
```

**Deploy do innych środowisk:**
```bash
npm run deploy:test   # test environment
npm run deploy:prod   # production environment
```

**Bezpośrednio przez CDK:**
```bash
cdk deploy --context env=dev --profile portfolio-api
```

### Po deployu

CDK wyświetli outputy:
- `ApiUrl` - URL Twojego API Gateway
- `ApiId` - ID API Gateway
- `PortfolioApiKeyId` - ID klucza API

**Aby znaleźć wartość API Key:**
1. AWS Console → API Gateway → API Keys
2. Szukaj klucza o nazwie: `LambdaApiKey-dev` (lub ID z outputów)
3. Kliknij na klucz i skopiuj wartość "API key"

## Dodawanie nowej Lambda function

Aby dodać nową funkcję Lambda:

1. Utwórz folder w `src/lambdas/` z plikiem `index.ts`
2. Dodaj konfigurację w `src/core/config/lambda.config.ts`:

```typescript
export const LAMBDA_FUNCTIONS: LambdaFunctionConfig[] = [
  {
    name: 'YourFunctionName',
    entry: 'your-function/index.ts',
    description: 'Description of your function',
    endpoints: [
      { 
        path: '/your-endpoint', 
        method: HttpMethod.POST, 
        requiresApiKey: true 
      }
    ],
  },
];
```


## Środowiska

Projekt wspiera wiele środowisk:
- `dev` - środowisko deweloperskie
- `test` - środowisko testowe
- `prod` - środowisko produkcyjne

Każde środowisko ma:
- Osobny CloudFormation stack
- Osobny stage w API Gateway
- Osobny API Key

## Bezpieczeństwo

- **API Key** - wszystkie endpointy wymagają API Key (opcjonalnie można wyłączyć w konfiguracji)
- **CORS** - skonfigurowany dla wszystkich originów (można ograniczyć w `api-gateway-factory.ts`)
- **Rate limiting** - 10 requests/second, burst 20
- **Quota** - 10,000 requests/day

## Rozwiązywanie problemów

### Błąd "Profile portfolio-api not found"
```bash
aws configure --profile portfolio-api
```

### Błąd "CDK bootstrap required"
```bash
cdk bootstrap --profile portfolio-api
```

### Błąd uprawnień
Sprawdź czy Twoje AWS credentials mają uprawnienia do:
- CloudFormation
- Lambda
- API Gateway
- IAM (do tworzenia ról)
- S3 (dla CDK bootstrap)

### API nie widoczne w Console
- Sprawdź region (domyślnie `eu-west-1`)
- Odśwież stronę w AWS Console
- Sprawdź przez CloudFormation → Resources → znajdź API Gateway

## Licencja

MIT

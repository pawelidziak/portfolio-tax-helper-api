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
│   └── app.ts                           # Punkt wejścia aplikacji CDK
├── src/
│   ├── core/                            # Core funkcjonalność
│   │   ├── calculations/                # Kalkulatory finansowe (SRP)
│   │   │   ├── options-calculator.ts    # Kalkulacje dla opcji
│   │   │   ├── stocks-calculator.ts     # Kalkulacje dla akcji
│   │   │   └── index.ts
│   │   ├── config/                      # Konfiguracja
│   │   │   ├── api-messages.config.ts   # Komunikaty błędów/sukcesu
│   │   │   ├── lambda.config.ts         # Konfiguracja Lambda functions
│   │   │   └── index.ts
│   │   ├── factories/                   # Factory functions (CDK)
│   │   │   ├── api-gateway-factory.ts   # Tworzenie API Gateway
│   │   │   ├── api-router-factory.ts    # Routing endpointów
│   │   │   ├── lambda-factory.ts        # Tworzenie funkcji Lambda
│   │   │   └── index.ts
│   │   └── models/                      # Modele dla CDK/Core
│   │       ├── api-endpoint.model.ts    # Model endpointu API
│   │       ├── errors.model.ts          # Custom error classes
│   │       ├── lambda.model.ts          # Model konfiguracji Lambda
│   │       └── index.ts
│   ├── lambdas/                         # Funkcje Lambda
│   │   └── ibkr-csv-parser/
│   │       └── index.ts                 # IBKR CSV parser handler
│   ├── models/                          # Modele domenowe
│   │   ├── asset-category.enum.ts       # Kategorie aktywów
│   │   ├── csv-section.model.ts         # Model sekcji CSV
│   │   ├── currency.enum.ts             # Waluty
│   │   ├── exchange-rate.model.ts       # Kursy wymiany
│   │   ├── ibkr-statement.model.ts      # Statement IBKR
│   │   ├── ibkr-trade.dto.ts            # DTO transakcji z CSV
│   │   ├── nbp-rate.dto.ts              # DTO odpowiedzi API NBP
│   │   ├── trade-summary.model.ts       # Podsumowanie transakcji
│   │   ├── trade.model.ts               # Model transakcji
│   │   └── index.ts
│   ├── parsers/                         # Parsery (CSV, multipart)
│   │   ├── ibkr-statement-csv.parser.ts # Parser plików CSV IBKR
│   │   ├── ibkr-trades.parser.ts        # Parser sekcji Trades
│   │   ├── multipart-parser.ts          # Parser multipart/form-data
│   │   └── index.ts
│   ├── services/                        # Serwisy biznesowe
│   │   ├── nbp.service.ts               # Komunikacja z API NBP
│   │   ├── trade-mapper.service.ts      # Mapowanie transakcji IBKR
│   │   └── index.ts
│   ├── utils/                           # Funkcje pomocnicze (SRP)
│   │   ├── csv-parse.utils.ts           # Parsowanie linii CSV
│   │   ├── date.utils.ts                # Operacje na datach
│   │   ├── error-handler.utils.ts       # Obsługa błędów
│   │   ├── response.utils.ts            # Tworzenie odpowiedzi HTTP
│   │   ├── validation.utils.ts          # Walidacja (Zod)
│   │   └── index.ts
│   └── stack.ts                         # Główny stack CDK
├── .env.example                         # Przykładowa konfiguracja środowiska
├── .gitignore
├── cdk.json                             # Konfiguracja CDK
├── package.json
├── tsconfig.json
└── README.md
```

### Architektura i zasady

Projekt zbudowany zgodnie z zasadami:
- **KISS** (Keep It Simple, Stupid) - prostota i czytelność kodu
- **SRP** (Single Responsibility Principle) - każdy moduł ma jedną odpowiedzialność
- **Pure Functions** - funkcje bez efektów ubocznych, łatwe do testowania
- **Factory Pattern** - modułowe komponenty infrastruktury
- **Error Handling** - centralna obsługa błędów z custom error classes

### Opis głównych modułów

**`core/calculations/`** - Kalkulatory finansowe
- `options-calculator.ts` - oblicza revenue/cost/income dla opcji (opening, closing, assignment)
- `stocks-calculator.ts` - oblicza revenue/cost/income dla akcji (opening, closing)

**`core/config/`** - Konfiguracja projektu
- `lambda.config.ts` - definicja wszystkich funkcji Lambda i ich endpointów
- `api-messages.config.ts` - komunikaty błędów i sukcesu

**`core/factories/`** - Fabryki komponentów CDK
- `lambda-factory.ts` - tworzy funkcje Lambda z konfiguracją
- `api-gateway-factory.ts` - tworzy API Gateway z CORS i API Key
- `api-router-factory.ts` - łączy endpointy z funkcjami Lambda

**`parsers/`** - Parsery danych wejściowych
- `multipart-parser.ts` - parsuje multipart/form-data z API Gateway
- `ibkr-statement-csv.parser.ts` - parsuje pliki CSV z IBKR na sekcje
- `ibkr-trades.parser.ts` - parsuje sekcję Trades do IBKRTradeDto[]

**`services/`** - Serwisy biznesowe
- `nbp.service.ts` - pobiera kursy walut z API NBP
- `trade-mapper.service.ts` - mapuje transakcje IBKR na Trade[] z kursami NBP

**`utils/`** - Funkcje pomocnicze (każda z jedną odpowiedzialnością)
- `error-handler.utils.ts` - konwertuje błędy na odpowiedzi HTTP
- `response.utils.ts` - tworzy standardowe odpowiedzi HTTP
- `validation.utils.ts` - waliduje dane wejściowe (Zod)
- `csv-parse.utils.ts` - parsuje linie CSV
- `date.utils.ts` - operacje na datach

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

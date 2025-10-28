# Infura Demo Backend

A Hono.js backend API built with Bun for the Infura demo project.

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) installed on your system

### Installation

```bash
cd backend
bun install
```

### Development

```bash
bun run dev
```

The server will start on `http://localhost:3001`

### Production

```bash
bun run build
bun run start
```

## API Endpoints

### Health Check

- **GET** `/`
- Returns API information and available endpoints

### Collect Data

- **POST** `/collectData`
- Collects and processes data from various sources

**Request Body:**

```json
{
  "data": "any data to collect",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "source": "api|web|mobile",
  "metadata": {}
}
```

**Response:**

```json
{
  "success": true,
  "message": "Data collected successfully",
  "data": {
    "id": "uuid",
    "data": "collected data",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "collectedAt": "2024-01-01T00:00:00.000Z",
    "source": "api",
    "metadata": {}
  }
}
```

### Aggregate Data

- **GET** `/aggregateData`
- Retrieves aggregated data with optional filtering

**Query Parameters:**

- `startDate` (optional): ISO 8601 date string
- `endDate` (optional): ISO 8601 date string
- `source` (optional): Filter by data source
- `groupBy` (optional): Grouping interval (default: 'hour')
- `limit` (optional): Maximum number of results (default: 100)

**Example:**

```
GET /aggregateData?startDate=2024-01-01T00:00:00.000Z&endDate=2024-01-02T00:00:00.000Z&source=api&groupBy=hour&limit=50
```

**Response:**

```json
{
  "success": true,
  "data": {
    "summary": {
      "totalRecords": 150,
      "dateRange": {
        "start": "2024-01-01T00:00:00.000Z",
        "end": "2024-01-02T00:00:00.000Z"
      },
      "groupBy": "hour",
      "sources": ["api"]
    },
    "data": [
      {
        "timestamp": "2024-01-01T00:00:00.000Z",
        "count": 25,
        "averageValue": 42.5,
        "source": "api"
      }
    ],
    "metadata": {
      "generatedAt": "2024-01-01T00:00:00.000Z",
      "query": {
        "startDate": "2024-01-01T00:00:00.000Z",
        "endDate": "2024-01-02T00:00:00.000Z",
        "source": "api",
        "groupBy": "hour",
        "limit": 50
      }
    }
  }
}
```

## Features

- ✅ CORS enabled for cross-origin requests
- ✅ TypeScript support
- ✅ Error handling and validation
- ✅ JSON request/response handling
- ✅ Query parameter validation
- ✅ Mock data for development
- ✅ Health check endpoint

## Project Structure

```
backend/
├── src/
│   └── index.ts          # Main server file
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
└── README.md            # This file
```

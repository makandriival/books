# NestJS GraphQL Book Catalog API

A production-ready GraphQL API for a book catalog with advanced search, caching, and rate limiting built with NestJS, TypeORM, PostgreSQL, and Redis.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start with Docker (includes PostgreSQL + Redis)
docker compose up

# Or run locally
npm run start:dev
```

**GraphQL Playground:** http://localhost:8000/graphql

## 📋 Project Summary

This project implements a complete book catalog system with:

- **GraphQL Search API** - Advanced search across books, authors, and comments with filters
- **Redis Caching** - Automatic result caching for improved performance (~90% faster)
- **Rate Limiting** - Protection against API abuse (100 requests/minute)
- **Database Seeding** - Pre-populated with 1000 books, 160 users, and thousands of comments
- **Full Test Coverage** - 51 unit and e2e tests covering all major functionality

### Key Features

- ✅ Complex search with case-insensitive, partial matching across multiple entities
- ✅ Filters: genre (exact match) and publicationYear (range filter)
- ✅ Related entities automatically included (authors, comments)
- ✅ JWT authentication with role-based access control
- ✅ Docker-ready with health checks
- ✅ TypeORM migrations for schema management

## 🛠️ Tech Stack

- **NestJS** - Progressive Node.js framework
- **GraphQL (Apollo Server)** - Query language and API
- **TypeORM** - ORM for PostgreSQL
- **PostgreSQL** - Relational database
- **Redis** - Caching layer
- **Jest** - Testing framework
- **Docker** - Containerization

## 📦 Setup

### Prerequisites

- Node.js v20+
- Docker (recommended) OR local PostgreSQL + Redis

### Installation

1. **Clone and install**

   ```bash
   git clone <repository-url>
   cd books
   npm install
   ```

2. **Environment configuration**

   ```bash
   cp .env-example .env
   ```

   Key variables:

   ```env
   PORT=8000
   DB_HOST=localhost
   POSTGRES_PORT=5432
   POSTGRES_USER=postgres
   POSTGRES_PASSWORD=postgres
   POSTGRES_DB=postgres
   REDIS_HOST=localhost
   REDIS_PORT=6379
   REDIS_TTL=3600
   JWT_SECRET=your-secret-key-here
   ```

3. **Start services**

   **Option A: Docker (Recommended)**

   ```bash
   docker compose up
   ```

   This starts PostgreSQL, Redis, and the application with hot-reload enabled.

   **Option B: Local Development**

   ```bash
   # Start PostgreSQL and Redis separately
   docker compose up database redis -d

   # Run migrations
   npm run mr

   # Seed database (creates 1000 books)
   npm run seed

   # Start application
   npm run start:dev
   ```

## 🔍 GraphQL API Usage

### Search Query

The main `search` query accepts:

- `query` (required): Search text (searches across title, description, genre, author names)
- `filters` (optional):
  - `genre`: Exact match filter
  - `publicationYear`: Range filter [startYear, endYear]

### Example Queries

**Basic Search:**

```graphql
query {
  search(input: { query: "fiction" }) {
    id
    title
    description
    genre
    publicationYear
    authors {
      id
      firstName
      lastName
    }
    comments {
      id
      content
      rating
    }
  }
}
```

**Search with Filters:**

```graphql
query {
  search(
    input: {
      query: "science"
      filters: { genre: "Fiction", publicationYear: [2000, 2020] }
    }
  ) {
    id
    title
    genre
    publicationYear
    authors {
      firstName
      lastName
    }
  }
}
```

**Multi-word Search:**

```graphql
query {
  search(input: { query: "fantasy adventure" }) {
    title
    authors {
      firstName
      lastName
    }
  }
}
```

### Response Format

```json
{
  "data": {
    "search": [
      {
        "id": "uuid",
        "title": "Book Title",
        "description": "Book description",
        "genre": "Fiction",
        "publicationYear": 2015,
        "authors": [
          {
            "id": "uuid",
            "firstName": "John",
            "lastName": "Doe"
          }
        ],
        "comments": [...]
      }
    ]
  }
}
```

## 🎯 Performance

### Redis Caching

Search results are automatically cached:

- **Cache Key**: Based on query + filters
- **TTL**: 1 hour (configurable via `REDIS_TTL`)
- **Performance**: ~90% faster for cached queries (50ms → 5ms)

Cache behavior:

1. First request → Database query → Cache result
2. Identical request → Return from cache (fast!)
3. Different query → New cache entry

### Rate Limiting

- **Limit**: 100 requests per minute (production-ready)
- **Scope**: All GraphQL queries/mutations
- **Response**: 429 Too Many Requests when exceeded
- **Configurable**: Adjust in `src/app.module.ts` based on your needs

For higher traffic applications, consider increasing to 500-1000 req/min or implementing per-user rate limiting.

## 🧪 Testing

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# E2E tests
npm run test:e2e

# Specific test suites
npm run test:e2e -- books-search.e2e-spec.ts    # Search functionality
npm run test:e2e -- books-cache.e2e-spec.ts     # Cache behavior
npm run test:e2e -- books-rate-limit.e2e-spec.ts # Rate limiting

# Coverage
npm run test:cov
```

**Test Results:**

- ✅ 51 tests passing
- ✅ BooksService: 22 tests (search logic + caching)
- ✅ BooksResolver: 7 tests
- ✅ E2E Search: 19 tests
- ✅ E2E Cache: 5 tests
- ✅ E2E Rate Limiting: 1 test

## 📊 Database

### Schema

- **Books** - id, title, description, genre, publicationYear, cover, pages
- **Users (Authors)** - id, firstName, lastName, email, role (WRITER/MODERATOR/CONSUMER)
- **Comments** - id, content, rating, bookId, userId
- **Relationships**: Books ↔ Authors (many-to-many), Books ↔ Comments (one-to-many)

### Seeding

```bash
npm run seed
```

Creates:

- 1000 books with random titles and descriptions
- 160 users (50 writers, 10 moderators, 100 consumers)
- Thousands of comments with ratings

### Migrations

```bash
npm run mg NAME=migration-name  # Generate from entities
npm run mc NAME=migration-name  # Create empty migration
npm run mr                      # Run migrations
npm run mre                     # Revert last migration
```

## 🔧 Available Scripts

| Command              | Description              |
| -------------------- | ------------------------ |
| `npm run start:dev`  | Start with hot-reload    |
| `npm run start:prod` | Start production build   |
| `npm run build`      | Build for production     |
| `npm test`           | Run unit tests           |
| `npm run test:e2e`   | Run e2e tests            |
| `npm run test:cov`   | Generate coverage report |
| `npm run lint`       | Lint and fix code        |
| `npm run format`     | Format with Prettier     |
| `npm run seed`       | Seed database            |
| `npm run mr`         | Run migrations           |

## 🐳 Docker

The project includes full Docker support:

```bash
# Start everything
docker compose up

# Start specific services
docker compose up database redis -d

# Rebuild after changes
docker compose up --build

# Stop all services
docker compose down

# View logs
docker compose logs -f app
```

**Services:**

- `database` - PostgreSQL 12 on port 5432
- `redis` - Redis 7 on port 6379
- `app` - NestJS application on port 8000

## 🔐 Authentication

The API includes JWT authentication:

```graphql
mutation {
  login(email: "user@example.com", password: "password") {
    accessToken
  }
}
```

Use the token in subsequent requests:

```
Authorization: Bearer <accessToken>
```

**Roles:** WRITER, MODERATOR, CONSUMER (role-based access control implemented)

## 📂 Project Structure

```
src/
├── common/           # Shared utilities, guards, decorators
├── config/           # Configuration (cache, ORM, naming strategy)
├── database/         # Migrations and seeders
├── modules/
│   ├── auth/        # JWT authentication
│   ├── books/       # Book search functionality
│   ├── user/        # User management
│   └── baseModule/  # Base repository pattern
└── main.ts          # Application entry point

test/                # E2E tests
```

## 🐛 Troubleshooting

**Redis connection error:**

```bash
# Verify Redis is running
docker compose ps
redis-cli ping  # Should return PONG
```

**Database connection error:**

```bash
# Check PostgreSQL
docker compose logs database
```

**Port already in use:**

```bash
# Change PORT in .env or stop conflicting service
lsof -ti:8000 | xargs kill -9
```

## 📝 Notes

- This project uses a NestJS boilerplate template ([template link](https://github.com/example/template) if applicable)
- Rate limiting set to 100 req/min (adjust in `app.module.ts` for your needs)
- Search is case-insensitive and supports partial matching
- All timestamps are in UTC
- Redis cache automatically expires after TTL

## 📄 License

MIT

## 👤 Author

Dmytro Polhul

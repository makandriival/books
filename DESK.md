Requirements
1. Project Setup
● Framework: Use NestJS with GraphQL (choose either Apollo + Express or Mercurius +
Fastify).
● Option: You may write the setup from scratch or use a boilerplate from GitHub. If using a
boilerplate, include the link to the boilerplate in the README.md file or you can use our
template for start: link
● Deliverables:
○ A fully functional NestJS project with GraphQL configured.

2. Database Setup
● Database: Use PostgreSQL.
● Schema: Create a schema for a book catalog with at least two related entities (e.g.,
Book and Author with relationship).
● Seed Script: Provide a seed script to populate the database with sample data (at least
1000 books and 5 authors with relationships).
● Tools: Use TypeORM for database interactions.
● Deliverables:
○ SQL or ORM migration files for the database schema.
○ A seed script (e.g., seed.ts or seed.sql) to populate the database.

3. GraphQL API
● Query: Implement a single complex GraphQL query called search with the following
parameters:
○ query: A string to search across all entities (case-insensitive, partial match,
covered few words cases).
○ filters: An object supporting filters like genre (e.g., Fiction, Non-Fiction) and
publicationYear (range filter, e.g., 2000–2025) etc.
○ result: must contain all entities found, example:

"data": {
"entity1": [...],
"entity2": [...],
....etc
}

● Deliverables:
○ GraphQL schema definition (schema.gql or equivalent).
○ Resolver implementation for search.

4. Caching
● Redis: Implement caching for search query results using Redis.
5. Rate Limiting
● Implementation: Add rate limiting to the GraphQL endpoint.
● Deliverables:
○ Rate limiting configuration setup.

6. Documentation
● README.md: Include:
○ Project setup instructions (e.g., npm install, database setup, Redis setup,
environment variables).
○ Instructions to run the seed script.
○ Example GraphQL query for search with sample inputs and outputs.
○ If using a boilerplate, include the GitHub link.

7. Testing
● Unit Tests: Write unit tests and integration tests covering major functionalities of query.
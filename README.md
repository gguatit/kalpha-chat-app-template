# Today's Horoscope

![License](https://img.shields.io/badge/license-MIT-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-orange)
![D1 Database](https://img.shields.io/badge/Cloudflare-D1-orange)

A serverless horoscope chat application powered by Cloudflare Workers AI and D1 Database. This project demonstrates a full-stack implementation of a Korean-language AI chatbot with secure user authentication and real-time streaming responses.

## Features

**AI-Powered Analysis**
Leverages the Llama 3.1 8B model via Cloudflare Workers AI to generate daily horoscope readings based on birth data. Optimized system prompts ensure natural Korean output and context-aware advice.

**Real-time Interaction**
Utilizes Server-Sent Events (SSE) for streaming AI responses, providing an immediate and engaging user experience similar to modern chat interfaces.

**User Management**
Complete authentication system including registration and login. User birth data is automatically retrieved upon login to streamline the horoscope request process.

**Persistent State**
Frontend state management using LocalStorage ensures chat history and user sessions persist across page reloads.

## Security Architecture

**Database Protection**
Strict usage of parameterized queries (Cloudflare D1 `prepare().bind()`) to eliminate SQL injection vulnerabilities.

**Password Hashing**
Implementation of PBKDF2 (SHA-256, 100,000 iterations) with unique per-user salts for secure password storage.

**Input Validation & Sanitization**
Comprehensive validation for user inputs and HTML sanitization to prevent XSS attacks.

**Stateless Authentication**
JWT (JSON Web Token) based authentication for secure and scalable session management.

## Tech Stack

*   **Runtime**: Cloudflare Workers
*   **Language**: TypeScript
*   **Database**: Cloudflare D1 (SQLite)
*   **AI Model**: Llama 3.1 8B (Workers AI)
*   **Frontend**: Vanilla JavaScript, HTML5, CSS3

## Getting Started

### Prerequisites

*   Node.js 18 or higher
*   Wrangler CLI
*   Cloudflare Account

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/gguatit/Today-s-horoscope.git
    cd Today-s-horoscope
    npm install
    ```

2.  **Authenticate with Cloudflare**
    ```bash
    npx wrangler login
    ```

3.  **Database Setup**
    Create a D1 database and update `wrangler.jsonc` with the new ID.
    ```bash
    npx wrangler d1 create horoscope-db
    ```

4.  **Schema Migration**
    ```bash
    # Local
    npx wrangler d1 execute horoscope-db --local --file=./schema.sql

    # Remote
    npx wrangler d1 execute horoscope-db --remote --file=./schema.sql
    ```

5.  **Development & Deployment**
    ```bash
    # Run locally
    npm run dev

    # Deploy to Cloudflare
    npm run deploy
    ```

## Project Structure

```
src/
  index.ts       # Application entry point, API routes, and business logic
  types.ts       # TypeScript definitions
public/
  index.html     # Main application view
  chat.js        # Frontend controller and state management
  styles.css     # Application styling
schema.sql       # Database schema definition
wrangler.jsonc   # Cloudflare configuration
```

## License

Distributed under the MIT License.
